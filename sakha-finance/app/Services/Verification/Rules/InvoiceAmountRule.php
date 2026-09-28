<?php

namespace App\Services\Verification\Rules;

use App\Models\Transaction;
use App\Services\Verification\VerificationResult;
use App\Services\Verification\VerificationRule;

/**
 * Invoice total must equal the transaction total.
 */
class InvoiceAmountRule implements VerificationRule
{
    public function key(): string
    {
        return 'invoice_amount';
    }

    public function label(): string
    {
        return 'Invoice Amount';
    }

    public function evaluate(Transaction $transaction): VerificationResult
    {
        $transaction->loadMissing('invoices');
        $invoice = $transaction->invoices->first();

        if (! $invoice) {
            return VerificationResult::warning(
                $this->key(),
                $this->label(),
                'No invoice on file yet; amount match could not be confirmed.',
                ['transaction_total' => (string) $transaction->total_amount],
            );
        }

        $invoiceTotal = bcadd((string) $invoice->amount, (string) $invoice->tax_amount, 2);
        $transactionTotal = (string) $transaction->total_amount;
        $diff = bcsub($invoiceTotal, $transactionTotal, 2);

        if (bccomp($diff, '0', 2) === 0) {
            return VerificationResult::pass(
                $this->key(),
                $this->label(),
                'Invoice total matches the transaction total.',
                ['amount' => $transactionTotal],
            );
        }

        $sign = bccomp($diff, '0', 2) > 0 ? '+' : '';

        return VerificationResult::failed(
            $this->key(),
            $this->label(),
            'Invoice total does not match the transaction total.',
            [
                'invoice_total' => $invoiceTotal,
                'transaction_total' => $transactionTotal,
                'difference' => $sign.$diff,
            ],
        );
    }
}
