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

        // Apply configurable thresholds (Settings → Verifikasi). A run that has
        // no hard failures but scores below the minimum is downgraded to WARNING,
        // so a weak-but-passing file still gets a human look.
        $minScore = (int) \App\Models\SystemSetting::get('verification_min_score', 0);
        if ($overall === VerificationStatus::PASS && $minScore > 0 && $score < $minScore) {
            $overall = VerificationStatus::WARNING;
        }

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
                "Verifikasi dijalankan: {$overall->label()} ({$counts['PASS']} sesuai, {$counts['WARNING']} perlu diperiksa, {$counts['FAILED']} tidak sesuai)",
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

        // How many failed checks force a review is configurable (Settings).
        $threshold = max(1, (int) \App\Models\SystemSetting::get('verification_auto_review_threshold', 1));
        $forceReview = $overall === VerificationStatus::FAILED && $counts['FAILED'] >= $threshold;

        if ($forceReview) {
            if (! $status->isTerminal() && $status->value !== 'NEEDS_REVIEW') {
                $transaction->forceFill(['status' => \App\Enums\TransactionStatus::NEEDS_REVIEW])->save();
                $this->notifications->notifyVerificationFailed($transaction, $counts['FAILED']);
            } else {
                $this->notifications->notifyVerificationFailed($transaction, $counts['FAILED']);
            }
        } elseif ($overall === VerificationStatus::FAILED || $overall === VerificationStatus::WARNING) {
            $warnings = $counts['WARNING'] + $counts['FAILED'];
            $this->notifications->notifyVerificationWarning($transaction, max($warnings, 1));
        }

        $this->notifyMissingRequiredDocuments($transaction);
    }

    /**
     * Raise a notification when required documents are missing.
     *
     * De-duplicated: if an unread notification of the same type already exists
     * for this transaction, we do not create another, so re-running verification
     * does not flood the bell.
     */
    private function notifyMissingRequiredDocuments(Transaction $transaction): void
    {
        $missing = $this->missingRequiredDocumentLabels($transaction);

        if (empty($missing)) {
            return;
        }

        $already = \App\Models\AppNotification::query()
            ->where('type', 'document_missing')
            ->where('entity_type', 'transaction')
            ->where('entity_id', $transaction->id)
            ->whereNull('read_at')
            ->exists();

        if ($already) {
            return;
        }

        $this->notifications->notifyMissingDocuments($transaction, implode(', ', $missing));
    }

    /**
     * @return array<int, string> Human labels of required documents not present.
     */
    private function missingRequiredDocumentLabels(Transaction $transaction): array
    {
        $required = \App\Models\RequiredDocumentRule::requiredTypes();

        if (empty($required)) {
            return [];
        }

        $transaction->loadMissing('documents');

        $present = $transaction->documents
            ->where('status', '!=', \App\Enums\DocumentStatus::REJECTED)
            ->pluck('document_type')
            ->map(fn ($t) => $t instanceof \App\Enums\DocumentType ? $t->value : $t)
            ->unique()
            ->all();

        return array_values(array_map(
            fn (string $v) => \App\Enums\DocumentType::tryFrom($v)?->label() ?? $v,
            array_filter($required, fn (string $v) => ! in_array($v, $present, true)),
        ));
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
