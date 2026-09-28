<?php

namespace App\Services\Verification\Rules;

use App\Enums\DocumentStatus;
use App\Enums\DocumentType;
use App\Enums\TransactionStatus;
use App\Models\RequiredDocumentRule;
use App\Models\Transaction;
use App\Services\Verification\VerificationResult;
use App\Services\Verification\VerificationRule;

/**
 * Ensures every configured required document type is present and not rejected.
 *
 * Stage awareness: some documents only become required once the transaction
 * reaches a stage where they should exist. A DELIVERY_ORDER, for example, cannot
 * be missing before the transaction even has a delivery — flagging it that early
 * would produce false failures. Documents still missing at the relevant stage are
 * reported as FAILED; documents not yet due are simply not evaluated.
 */
class RequiredDocumentsRule implements VerificationRule
{
    /** Document types that only apply from a given transaction stage onward. */
    private const STAGE_GATED = [
        'DELIVERY_ORDER' => ['PREPARING_DELIVERY', 'IN_DELIVERY', 'DELIVERED', 'COMPLETED'],
    ];

    public function key(): string
    {
        return 'required_documents';
    }

    public function label(): string
    {
        return 'Required Documents';
    }

    public function evaluate(Transaction $transaction): VerificationResult
    {
        $transaction->loadMissing('documents');
        $required = RequiredDocumentRule::requiredTypes();
        $currentStage = $transaction->status instanceof TransactionStatus
            ? $transaction->status
            : TransactionStatus::from((string) $transaction->status);

        // Filter out stage-gated document types that do not apply yet.
        $applicable = array_values(array_filter($required, function (string $type) use ($currentStage) {
            if (! isset(self::STAGE_GATED[$type])) {
                return true;
            }

            return in_array($currentStage->value, self::STAGE_GATED[$type], true);
        }));

        $present = $transaction->documents
            ->where('status', '!=', DocumentStatus::REJECTED)
            ->pluck('document_type')
            ->map(fn ($t) => $t->value)
            ->unique()
            ->all();

        $missing = array_values(array_diff($applicable, $present));

        if (empty($missing)) {
            return VerificationResult::pass(
                $this->key(),
                $this->label(),
                'All required documents for this stage are present.',
                ['required' => $applicable, 'missing' => [], 'stage' => $currentStage->value],
            );
        }

        $labels = collect($missing)
            ->map(fn (string $type) => DocumentType::from($type)->label())
            ->implode(', ');

        return VerificationResult::failed(
            $this->key(),
            $this->label(),
            'Missing required document(s): '.$labels.'.',
            ['required' => $applicable, 'missing' => $missing, 'stage' => $currentStage->value],
        );
    }
}
