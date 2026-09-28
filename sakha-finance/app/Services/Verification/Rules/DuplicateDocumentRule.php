<?php

namespace App\Services\Verification\Rules;

use App\Models\Transaction;
use App\Services\Verification\VerificationResult;
use App\Services\Verification\VerificationRule;

/**
 * Detects duplicate document numbers within the same transaction and across
 * the system (a strong signal of a mis-filed or duplicated document).
 */
class DuplicateDocumentRule implements VerificationRule
{
    public function key(): string
    {
        return 'duplicate_document';
    }

    public function label(): string
    {
        return 'Duplicate Document';
    }

    public function evaluate(Transaction $transaction): VerificationResult
    {
        $transaction->loadMissing('documents');

        $duplicates = $transaction->documents
            ->filter(fn ($d) => ! empty($d->document_number))
            ->groupBy(fn ($d) => $d->document_type->value.'|'.$d->document_number)
            ->filter(fn ($group) => $group->count() > 1)
            ->map(fn ($group) => [
                'type' => $group->first()->document_type->value,
                'number' => $group->first()->document_number,
                'count' => $group->count(),
            ])
            ->values()
            ->all();

        if (empty($duplicates)) {
            return VerificationResult::pass(
                $this->key(),
                $this->label(),
                'No duplicate document numbers detected.',
            );
        }

        $summary = collect($duplicates)
            ->map(fn ($d) => $d['type'].' #'.$d['number'].' (x'.$d['count'].')')
            ->implode(', ');

        return VerificationResult::warning(
            $this->key(),
            $this->label(),
            'Possible duplicate document number(s): '.$summary.'. Please review.',
            ['duplicates' => $duplicates],
        );
    }
}
