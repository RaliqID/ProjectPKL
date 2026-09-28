<?php

namespace App\Services\Verification\Rules;

use App\Models\Transaction;
use App\Services\Verification\VerificationResult;
use App\Services\Verification\VerificationRule;

/**
 * Checks the payment balance:
 *  - no payment yet            -> WARNING (not necessarily an error)
 *  - partial payment           -> WARNING (allowed, flagged)
 *  - payment exceeds total      -> FAILED
 *  - fully settled              -> PASS
 */
class PaymentBalanceRule implements VerificationRule
{
    public function key(): string
    {
        return 'payment_balance';
    }

    public function label(): string
    {
        return 'Payment Balance';
    }

    public function evaluate(Transaction $transaction): VerificationResult
    {
        $transaction->loadMissing('payments');
        $paid = $transaction->confirmedPaidAmount();
        $total = (string) $transaction->total_amount;
        $outstanding = $transaction->outstandingAmount();

        if (bccomp($paid, '0', 2) === 0) {
            return VerificationResult::warning(
                $this->key(),
                $this->label(),
                'No confirmed payment recorded yet.',
                ['paid' => $paid, 'total' => $total, 'outstanding' => $outstanding],
            );
        }

        if (bccomp($paid, $total, 2) > 0) {
            $diff = bcsub($paid, $total, 2);

            return VerificationResult::failed(
                $this->key(),
                $this->label(),
                'Confirmed payments exceed the transaction total without explanation.',
                ['paid' => $paid, 'total' => $total, 'difference' => '+'.$diff],
            );
        }

        if (bccomp($outstanding, '0', 2) > 0) {
            return VerificationResult::warning(
                $this->key(),
                $this->label(),
                'Partial payment received; balance is still outstanding.',
                ['paid' => $paid, 'total' => $total, 'outstanding' => $outstanding],
            );
        }

        return VerificationResult::pass(
            $this->key(),
            $this->label(),
            'Payment is fully settled.',
            ['paid' => $paid, 'total' => $total],
        );
    }
}
