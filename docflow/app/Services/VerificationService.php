<?php

namespace App\Services;

use App\Enums\VerificationStatus;
use App\Models\Transaction;
use App\Models\User;
use App\Models\VerificationRun;
use App\Services\Verification\Rules\DateConsistencyRule;
use App\Services\Verification\Rules\DeliveryTrackingRule;
use App\Services\Verification\Rules\DocumentFileValidityRule;
use App\Services\Verification\Rules\DuplicateDocumentRule;
use App\Services\Verification\Rules\InvoiceAmountRule;
use App\Services\Verification\Rules\InvoiceCustomerRule;
use App\Services\Verification\Rules\PaymentBalanceRule;
use App\Services\Verification\Rules\RequiredDocumentsRule;
use App\Services\Verification\VerificationResult;
use App\Services\Verification\VerificationRule;
use Illuminate\Support\Facades\DB;

/**
 * Deterministic verification engine. Rules are pluggable; add a rule to the
 * registry below and it automatically participates in every run.
 */
class VerificationService
{
    public function __construct(
        private readonly ActivityLogService $activity,
        private readonly NotificationService $notifications,
    ) {}

    /** @return array<VerificationRule> */
    public function rules(): array
    {
        return [
            new RequiredDocumentsRule,
            new InvoiceCustomerRule,
            new InvoiceAmountRule,
            new PaymentBalanceRule,
            new DeliveryTrackingRule,
            new DateConsistencyRule,
            new DuplicateDocumentRule,
            new DocumentFileValidityRule,
        ];
    }

    /**
     * Evaluate all rules and persist a verification run + its checks.
     */
    public function run(Transaction $transaction, ?User $actor = null): VerificationRun
    {
        $transaction->load([
            'customer', 'invoices', 'payments', 'deliveries', 'documents.versions',
        ]);

        $results = array_map(
            fn (VerificationRule $rule) => $rule->evaluate($transaction),
            $this->rules(),
        );

        $overall = $this->overallStatus($results);
        $counts = $this->counts($results);
        $score = $this->score($results);

        return DB::transaction(function () use ($transaction, $actor, $results, $overall, $counts, $score) {
            $run = VerificationRun::create([
                'transaction_id' => $transaction->id,
                'overall_status' => $overall->value,
                'score' => $score,
                'pass_count' => $counts['PASS'],
                'warning_count' => $counts['WARNING'],
                'failed_count' => $counts['FAILED'],
                'run_by' => $actor?->id,
            ]);

            foreach ($results as $result) {
                $run->checks()->create([
                    'rule_key' => $result->key,
                    'rule_label' => $result->label,
                    'status' => $result->status->value,
                    'message' => $result->message,
                    'metadata' => $result->metadata ?: null,
                ]);
            }

            // Verification outcome feeds the transaction workflow state.
            $this->applyToTransaction($transaction, $overall, $counts);

            $this->activity->logTransaction(
                $transaction->id,
                'verification.executed',
                "Verification executed: {$overall->value} ({$counts['PASS']} pass, {$counts['WARNING']} warning, {$counts['FAILED']} failed)",
                ['run_id' => $run->id, 'score' => $score, 'overall' => $overall->value],
            );

            return $run->load('checks');
        });
    }

    /**
     * Move the transaction to NEEDS_REVIEW when verification fails, and out of
     * NEEDS_REVIEW once it passes again (unless already terminal/completed).
     */
    private function applyToTransaction(Transaction $transaction, VerificationStatus $overall, array $counts): void
    {
        $status = $transaction->status;

        if ($overall === VerificationStatus::FAILED) {
            if (! $status->isTerminal() && $status->value !== 'NEEDS_REVIEW') {
                $transaction->forceFill(['status' => \App\Enums\TransactionStatus::NEEDS_REVIEW])->save();
                $this->notifications->notifyVerificationFailed($transaction, $counts['FAILED']);
            } else {
                $this->notifications->notifyVerificationFailed($transaction, $counts['FAILED']);
            }
        } elseif ($overall === VerificationStatus::WARNING) {
            $this->notifications->notifyVerificationWarning($transaction, $counts['WARNING']);
        }
    }

    /** @param array<VerificationResult> $results */
    public function overallStatus(array $results): VerificationStatus
    {
        $worst = VerificationStatus::PASS;

        foreach ($results as $result) {
            if ($result->status->weight() > $worst->weight()) {
                $worst = $result->status;
            }
        }

        return $worst;
    }

    /** @param array<VerificationResult> $results */
    public function counts(array $results): array
    {
        $counts = ['PASS' => 0, 'WARNING' => 0, 'FAILED' => 0];

        foreach ($results as $result) {
            $counts[$result->status->value]++;
        }

        return $counts;
    }

    /** @param array<VerificationResult> $results */
    public function score(array $results): int
    {
        $total = count($results);
        if ($total === 0) {
            return 0;
        }

        $points = 0;
        foreach ($results as $result) {
            $points += match ($result->status) {
                VerificationStatus::PASS => 100,
                VerificationStatus::WARNING => 50,
                VerificationStatus::FAILED => 0,
            };
        }

        return (int) round($points / $total);
    }
}
