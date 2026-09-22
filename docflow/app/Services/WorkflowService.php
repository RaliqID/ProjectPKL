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
            $reasons[] = 'A delivery already exists for this transaction.';
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

        if ($transaction->invoices->isEmpty()) {
            $reasons[] = 'Invoice is missing.';
        }

        if (! $transaction->isFullyPaid()) {
            $reasons[] = 'Payment is not fully settled.';
        }

        $delivery = $transaction->deliveries->sortByDesc('id')->first();
        if (! $delivery) {
            $reasons[] = 'Delivery record is missing.';
        } elseif ($delivery->status !== DeliveryStatus::DELIVERED) {
            $reasons[] = 'Delivery has not been marked as DELIVERED.';
        }

        // Required documents are evaluated by the same stage-aware rule used by
        // the verification engine, so the two never disagree.
        $docRule = new \App\Services\Verification\Rules\RequiredDocumentsRule;
        $docResult = $docRule->evaluate($transaction);
        if ($docResult->status === \App\Enums\VerificationStatus::FAILED) {
            $reasons[] = $docResult->message;
        }

        // Latest verification must not contain failures. If no run exists yet, we
        // report it as a reason rather than silently running verification here —
        // evaluating the completion gate must never mutate workflow state.
        $run = $transaction->latestVerificationRun;
        if (! $run) {
            $reasons[] = 'Verification has not been run yet.';
        } elseif ($run->failed_count > 0) {
            $reasons[] = "Verification has {$run->failed_count} failed check(s).";
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
