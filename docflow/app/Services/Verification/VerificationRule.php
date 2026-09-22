<?php

namespace App\Services\Verification;

use App\Enums\VerificationStatus;
use App\Models\Transaction;

/**
 * A single deterministic verification rule.
 */
interface VerificationRule
{
    /** Stable machine key, e.g. "invoice_amount". */
    public function key(): string;

    /** Human label shown in the UI, e.g. "Invoice Amount". */
    public function label(): string;

    /** Execute the rule against the transaction and return a result. */
    public function evaluate(Transaction $transaction): VerificationResult;
}
