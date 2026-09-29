<?php

namespace App\Services;

use App\Enums\DeliveryStatus;
use App\Enums\DocumentStatus;
use App\Enums\TransactionStatus;
use App\Enums\VerificationStatus;
use App\Models\RequiredDocumentRule;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Decides whether a transaction may advance, and explains every blocker.
 * Used both by the UI (to show reasons) and by the API (to enforce).
 */
class WorkflowService
{
    public function __construct(
        private readonly ActivityLogService $activity,
        private readonly VerificationService $verification,
    ) {}

    public function canMarkAsPaid(Transaction $transaction): array
    {
        $transaction->loadMissing('payments');
        $reasons = [];

        if (! $transaction->hasPayment()) {
            $reasons[] = 'No payment has been recorded yet.';
        }

        if (bccomp($transaction->confirmedPaidAmount(), '0', 2) <= 0) {
            $reasons[] = 'No confirmed payment exists.';
        }

        return ['allowed' => empty($reasons), 'reasons' => $reasons];
    }

    public function canStartDelivery(Transaction $transaction): array
    {
        $reasons = [];
        $transaction->loadMissing('deliveries');

        if ($transaction->status === TransactionStatus::NEEDS_REVIEW) {
            $reasons[] = 'Transaction is under review.';
        }

        if (! $transaction->isFullyPaid()) {
            $reasons[] = 'Transaction is not fully paid.';
        }

        if ($transaction->deliveries->isNotEmpty()) {
            $reasons[] = 'Pengiriman untuk transaksi ini sudah ada.';
        }

        return ['allowed' => empty($reasons), 'reasons' => $reasons];
    }

    /**
     * Completion conditions — the transaction cannot be marked COMPLETED unless
     * every one of these holds.
     */
    public function canCompleteTransaction(Transaction $transaction): array
    {
        $transaction->loadMissing('invoices', 'payments', 'deliveries', 'documents', 'latestVerificationRun');
        $reasons = [];

        // Already-complete (or cancelled) transactions have nothing left to do.
        if ($transaction->status === TransactionStatus::COMPLETED) {
            return ['allowed' => false, 'reasons' => ['This transaction is already completed.']];
        }
        if ($transaction->status === TransactionStatus::CANCELLED) {
            return ['allowed' => false, 'reasons' => ['This transaction was cancelled.']];
        }

        if ($transaction->invoices->isEmpty()) {
            $reasons[] = 'Invoice is missing.';
        }

        // The workflow cannot be short-circuited: a transaction must have advanced
        // through its stages (at least PAID) before it can be completed.
        $allowedStages = [
            \App\Enums\TransactionStatus::PAID,
            \App\Enums\TransactionStatus::PREPARING_DELIVERY,
            \App\Enums\TransactionStatus::IN_DELIVERY,
            \App\Enums\TransactionStatus::DELIVERED,
        ];
        if (! in_array($transaction->status, $allowedStages, true)) {
            $reasons[] = 'Transaksi belum mencapai tahap siap kirim.';
        }

        if (! $transaction->isFullyPaid()) {
            $reasons[] = 'Pembayaran belum lunas.';
        }

        $delivery = $transaction->deliveries->sortByDesc('id')->first();
        if (! $delivery) {
            $reasons[] = 'Data pengiriman belum ada.';
        } elseif ($delivery->status !== DeliveryStatus::DELIVERED) {
            $reasons[] = 'Pengiriman belum ditandai TERKIRIM.';
        }

        // Same rule the verification engine uses, so the two never disagree.
        $docRule = new \App\Services\Verification\Rules\RequiredDocumentsRule;
        $docResult = $docRule->evaluate($transaction);
        if ($docResult->status === \App\Enums\VerificationStatus::FAILED) {
            $reasons[] = $docResult->message;
        }

        // Latest verification must not contain failures. If no run exists yet, we
        // report it as a reason rather than silently running verification here;
        // evaluating the completion gate must never mutate workflow state.
        $run = $transaction->latestVerificationRun;
        if (! $run) {
            $reasons[] = 'Verifikasi belum dijalankan.';
        } elseif ($run->failed_count > 0) {
            $reasons[] = "Verifikasi memiliki {$run->failed_count} pemeriksaan yang tidak sesuai.";
        }

        return ['allowed' => empty($reasons), 'reasons' => $reasons];
    }

    /**
     * Complete a transaction, enforcing all conditions.
     */
    public function complete(Transaction $transaction, User $actor): Transaction
    {
        $check = $this->canCompleteTransaction($transaction);

        if (! $check['allowed']) {
            throw ValidationException::withMessages(['workflow' => $check['reasons']]);
        }

        if ($transaction->status !== TransactionStatus::DELIVERED) {
            // Normalise into DELIVERED before completing.
            $transaction->forceFill(['status' => TransactionStatus::DELIVERED])->save();
        }

        $transaction->forceFill([
            'status' => TransactionStatus::COMPLETED,
            'updated_by' => $actor->id,
        ])->save();

        $this->activity->logTransaction(
            $transaction->id,
            'transaction.completed',
            "Transaction {$transaction->transaction_code} completed",
            ['completed_by' => $actor->id],
        );

        return $transaction->refresh();
    }
}
