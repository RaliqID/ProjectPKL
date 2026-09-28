<?php

namespace App\Services\Verification\Rules;

use App\Enums\DocumentStatus;
use App\Models\Transaction;
use App\Services\Verification\VerificationResult;
use App\Services\Verification\VerificationRule;

/**
 * Confirms that every uploaded document is a valid, readable file on disk and
 * that none have been rejected.
 */
class DocumentFileValidityRule implements VerificationRule
{
    public function key(): string
    {
        return 'document_file_validity';
    }

    public function label(): string
    {
        return 'Document File Validity';
    }

    public function evaluate(Transaction $transaction): VerificationResult
    {
        $transaction->loadMissing('documents');

        if ($transaction->documents->isEmpty()) {
            return VerificationResult::warning(
                $this->key(),
                $this->label(),
                'No documents uploaded yet.',
            );
        }

        $missing = [];
        $rejected = [];

        foreach ($transaction->documents as $document) {
            if ($document->status === DocumentStatus::REJECTED) {
                $rejected[] = $document->document_type->label();
                continue;
            }

            if (! \Illuminate\Support\Facades\Storage::disk('local')->exists($document->file_path)) {
                $missing[] = $document->document_type->label();
            }
        }

        if (! empty($missing)) {
            return VerificationResult::failed(
                $this->key(),
                $this->label(),
                'Document file(s) not found on storage: '.implode(', ', $missing).'.',
                ['missing_files' => $missing],
            );
        }

        if (! empty($rejected)) {
            return VerificationResult::warning(
                $this->key(),
                $this->label(),
                'Rejected document(s) need re-upload: '.implode(', ', $rejected).'.',
                ['rejected' => $rejected],
            );
        }

        return VerificationResult::pass(
            $this->key(),
            $this->label(),
            'All document files are present and valid.',
            ['count' => $transaction->documents->count()],
        );
    }
}
