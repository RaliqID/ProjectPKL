<?php

namespace App\Services\Verification\Rules;

use App\Models\Transaction;
use App\Services\Verification\VerificationResult;
use App\Services\Verification\VerificationRule;

/**
 * Guards against obvious date inconsistencies:
 *  - invoice dated before the transaction
 *  - payment dated before the transaction
 *  - delivery shipped before the transaction
 */
class DateConsistencyRule implements VerificationRule
{
    public function key(): string
    {
        return 'date_consistency';
    }

    public function label(): string
    {
        return 'Date Consistency';
    }

    public function evaluate(Transaction $transaction): VerificationResult
    {
        $transaction->loadMissing('invoices', 'payments', 'deliveries');
        $txDate = $transaction->transaction_date?->startOfDay();
        $issues = [];

        if ($txDate) {
            foreach ($transaction->invoices as $invoice) {
                if ($invoice->invoice_date && $invoice->invoice_date->startOfDay()->lt($txDate)) {
                    $issues[] = "Invoice {$invoice->invoice_number} dated before the transaction";
                }
            }

            foreach ($transaction->payments as $payment) {
                if ($payment->payment_date && $payment->payment_date->startOfDay()->lt($txDate)) {
                    $issues[] = 'Payment dated before the transaction';
                }
            }

            foreach ($transaction->deliveries as $delivery) {
                if ($delivery->shipping_date && $delivery->shipping_date->startOfDay()->lt($txDate)) {
                    $issues[] = 'Delivery shipped before the transaction';
                }
            }
        }

        if (empty($issues)) {
            return VerificationResult::pass(
                $this->key(),
                $this->label(),
                'All dates are consistent with the transaction.',
            );
        }

        return VerificationResult::warning(
            $this->key(),
            $this->label(),
            implode('; ', $issues).'.',
            ['issues' => $issues],
        );
    }
}
