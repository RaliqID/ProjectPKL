<?php

namespace App\Http\Controllers\Api;

use App\Enums\DeliveryStatus;
use App\Enums\DocumentStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\Document;
use App\Models\Payment;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);

        return response()->json([
            'data' => [
                'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
                'transactions' => $this->transactionSummary($from, $to),
                'payments' => $this->paymentSummary($from, $to),
                'deliveries' => $this->deliverySummary($from, $to),
                'documents' => $this->documentSummary($from, $to),
                'verifications' => $this->verificationSummary($from, $to),
            ],
        ]);
    }

    public function exportTransactions(Request $request)
    {
        [$from, $to] = $this->range($request);

        $rows = Transaction::with('customer')
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('transaction_date')
            ->get();

        $callback = function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Transaction Code', 'Date', 'Customer', 'Status', 'Subtotal', 'Discount', 'Tax', 'Total']);

            foreach ($rows as $t) {
                fputcsv($out, [
                    $t->transaction_code,
                    $t->transaction_date?->toDateString(),
                    $t->customer?->name,
                    $t->status->value,
                    (string) $t->subtotal,
                    (string) $t->discount,
                    (string) $t->tax,
                    (string) $t->total_amount,
                ]);
            }

            fclose($out);
        };

        return response()->streamDownload($callback, 'transactions_report.csv', ['Content-Type' => 'text/csv']);
    }

    private function range(Request $request): array
    {
        $from = $request->filled('date_from') ? \Carbon\Carbon::parse($request->input('date_from')) : now()->startOfMonth();
        $to = $request->filled('date_to') ? \Carbon\Carbon::parse($request->input('date_to')) : now();

        return [$from->startOfDay(), $to->endOfDay()];
    }

    private function transactionSummary($from, $to): array
    {
        $transactions = Transaction::whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])->get();

        return [
            'count' => $transactions->count(),
            'total_amount' => (string) number_format($transactions->sum(fn ($t) => (float) $t->total_amount), 2, '.', ''),
            'completed' => $transactions->where('status', \App\Enums\TransactionStatus::COMPLETED)->count(),
            'needs_review' => $transactions->where('status', \App\Enums\TransactionStatus::NEEDS_REVIEW)->count(),
        ];
    }

    private function paymentSummary($from, $to): array
    {
        $payments = Payment::whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])->get();

        return [
            'count' => $payments->count(),
            'confirmed_amount' => (string) number_format($payments->where('status', PaymentStatus::CONFIRMED)->sum(fn ($p) => (float) $p->amount), 2, '.', ''),
            'pending_amount' => (string) number_format($payments->where('status', PaymentStatus::PENDING)->sum(fn ($p) => (float) $p->amount), 2, '.', ''),
            'rejected_count' => $payments->where('status', PaymentStatus::REJECTED)->count(),
        ];
    }

    private function deliverySummary($from, $to): array
    {
        $deliveries = Delivery::where(function ($q) use ($from, $to) {
            $q->whereBetween('shipping_date', [$from->toDateString(), $to->toDateString()])
                ->orWhereBetween('estimated_delivery_date', [$from->toDateString(), $to->toDateString()]);
        })->get();

        return [
            'count' => $deliveries->count(),
            'delivered' => $deliveries->where('status', DeliveryStatus::DELIVERED)->count(),
            'in_transit' => $deliveries->whereIn('status', [DeliveryStatus::SHIPPED, DeliveryStatus::IN_TRANSIT])->count(),
            'failed' => $deliveries->whereIn('status', [DeliveryStatus::FAILED, DeliveryStatus::RETURNED])->count(),
            'delayed' => $deliveries->filter(fn (Delivery $d) => $d->isDelayed())->count(),
        ];
    }

    private function documentSummary($from, $to): array
    {
        $documents = Document::whereBetween('created_at', [$from, $to])->get();

        return [
            'count' => $documents->count(),
            'verified' => $documents->where('status', DocumentStatus::VERIFIED)->count(),
            'pending' => $documents->whereIn('status', [DocumentStatus::UPLOADED, DocumentStatus::UNDER_REVIEW])->count(),
            'rejected' => $documents->where('status', DocumentStatus::REJECTED)->count(),
            'by_type' => $documents->groupBy(fn (Document $d) => $d->document_type->value)->map->count(),
        ];
    }

    private function verificationSummary($from, $to): array
    {
        $runs = \App\Models\VerificationRun::whereBetween('created_at', [$from, $to])->get();

        return [
            'count' => $runs->count(),
            'passed' => $runs->where('overall_status', 'PASS')->count(),
            'warnings' => $runs->where('overall_status', 'WARNING')->count(),
            'failed' => $runs->where('overall_status', 'FAILED')->count(),
            'average_score' => $runs->count() ? round($runs->avg('score')) : 0,
        ];
    }
}
