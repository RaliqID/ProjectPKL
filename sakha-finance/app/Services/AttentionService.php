<?php

namespace App\Services;

use App\Enums\DeliveryStatus;
use App\Enums\DocumentStatus;
use App\Enums\InvoiceStatus;
use App\Enums\TransactionStatus;
use App\Models\RequiredDocumentRule;
use App\Models\Transaction;
use Illuminate\Support\Collection;

/**
 * Builds the "What needs attention?" queue.
 * Severity is DERIVED from real conditions, never a decorative label.
 */
class AttentionService
{
    /**
     * @return Collection<int, array{severity:string,type:string,entity_type:string,entity_id:int,transaction_code:string,message:string,created_at:?string}>
     */
    public function build(int $limit = 50): Collection
    {
        $items = collect();

        $transactions = Transaction::with(['customer', 'invoices', 'payments', 'deliveries', 'documents', 'latestVerificationRun'])
            ->whereNotIn('status', [TransactionStatus::COMPLETED, TransactionStatus::CANCELLED])
            ->get();

        $required = RequiredDocumentRule::requiredTypes();

        foreach ($transactions as $transaction) {
            $this->collectMissingDocuments($items, $transaction, $required);
            $this->collectOverdueInvoice($items, $transaction);
            $this->collectVerificationFailure($items, $transaction);
            $this->collectDelayedDelivery($items, $transaction);
            $this->collectRejectedDocuments($items, $transaction);
            $this->collectPaymentMismatch($items, $transaction);
        }

        return $items
            ->sortByDesc(fn ($i) => $this->severityWeight($i['severity']))
            ->take($limit)
            ->values();
    }

    private function collectMissingDocuments(Collection $items, Transaction $transaction, array $required): void
    {
        if (empty($required)) {
            return;
        }

        $present = $transaction->documents
            ->where('status', '!=', DocumentStatus::REJECTED)
            ->pluck('document_type')->map(fn ($t) => $t->value)->unique()->all();

        $missing = array_values(array_diff($required, $present));

        if (empty($missing)) {
            return;
        }

        $labels = collect($missing)->map(fn (string $t) => \App\Enums\DocumentType::from($t)->label())->implode(', ');

        $items->push([
            'severity' => 'MEDIUM',
            'type' => 'missing_document',
            'entity_type' => 'transaction',
            'entity_id' => $transaction->id,
            'transaction_code' => $transaction->transaction_code,
            'message' => "Dokumen wajib belum lengkap: {$labels}.",
            'created_at' => $transaction->updated_at?->toIso8601String(),
        ]);
    }

    private function collectOverdueInvoice(Collection $items, Transaction $transaction): void
    {
        foreach ($transaction->invoices as $invoice) {
            if ($invoice->isOverdue()) {
                $items->push([
                    'severity' => 'HIGH',
                    'type' => 'payment_overdue',
                    'entity_type' => 'transaction',
                    'entity_id' => $transaction->id,
                    'transaction_code' => $transaction->transaction_code,
                    'message' => "Invoice {$invoice->invoice_number} telah lewat jatuh tempo {$invoice->daysOverdue()} hari.",
                    'created_at' => $invoice->due_date?->toIso8601String(),
                ]);
            }
        }
    }

    private function collectVerificationFailure(Collection $items, Transaction $transaction): void
    {
        $run = $transaction->latestVerificationRun;

        if ($run && $run->failed_count > 0) {
            $items->push([
                'severity' => 'HIGH',
                'type' => 'verification_failed',
                'entity_type' => 'transaction',
                'entity_id' => $transaction->id,
                'transaction_code' => $transaction->transaction_code,
                'message' => "Verifikasi tidak sesuai pada {$run->failed_count} pemeriksaan.",
                'created_at' => $run->created_at?->toIso8601String(),
            ]);
        }
    }

    private function collectDelayedDelivery(Collection $items, Transaction $transaction): void
    {
        $delivery = $transaction->deliveries->sortByDesc('id')->first();

        if ($delivery && $delivery->isDelayed()) {
            $days = (int) $delivery->estimated_delivery_date->startOfDay()->diffInDays(now()->startOfDay(), false) * -1;

            $items->push([
                'severity' => 'MEDIUM',
                'type' => 'delivery_delayed',
                'entity_type' => 'transaction',
                'entity_id' => $transaction->id,
                'transaction_code' => $transaction->transaction_code,
                'message' => "Pengiriman via {$delivery->courier} terlambat ".max($days, 1).' hari dari perkiraan.',
                'created_at' => $delivery->estimated_delivery_date?->toIso8601String(),
            ]);
        }
    }

    private function collectRejectedDocuments(Collection $items, Transaction $transaction): void
    {
        $rejected = $transaction->documents->where('status', DocumentStatus::REJECTED);

        if ($rejected->isEmpty()) {
            return;
        }

        $labels = $rejected->map(fn ($d) => $d->document_type->label())->implode(', ');

        $items->push([
            'severity' => 'HIGH',
            'type' => 'document_rejected',
            'entity_type' => 'transaction',
            'entity_id' => $transaction->id,
            'transaction_code' => $transaction->transaction_code,
            'message' => "Dokumen perlu diunggah ulang: {$labels}.",
            'created_at' => $transaction->updated_at?->toIso8601String(),
        ]);
    }

    private function collectPaymentMismatch(Collection $items, Transaction $transaction): void
    {
        $paid = $transaction->confirmedPaidAmount();
        $total = (string) $transaction->total_amount;

        if (bccomp($paid, '0', 2) > 0 && bccomp($paid, $total, 2) > 0) {
            $diff = bcsub($paid, $total, 2);

            $items->push([
                'severity' => 'HIGH',
                'type' => 'payment_mismatch',
                'entity_type' => 'transaction',
                'entity_id' => $transaction->id,
                'transaction_code' => $transaction->transaction_code,
                'message' => 'Pembayaran melebihi nilai invoice sebesar Rp '.number_format((float) $diff, 0, ',', '.').'.',
                'created_at' => $transaction->updated_at?->toIso8601String(),
            ]);
        }
    }

    private function severityWeight(string $severity): int
    {
        return match ($severity) {
            'HIGH' => 3,
            'MEDIUM' => 2,
            default => 1,
        };
    }
}
