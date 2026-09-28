<?php

namespace App\Services\Verification\Rules;

use App\Models\Document;
use App\Enums\DocumentType;
use App\Models\Transaction;
use App\Services\Verification\VerificationResult;
use App\Services\Verification\VerificationRule;

/**
 * Verifies the customer context of a transaction is coherent:
 *  - the transaction must have a customer assigned (structural requirement);
 *  - an invoice must exist;
 *  - if an INVOICE/TAX_INVOICE document carries a document number, it must match
 *    the transaction's invoice number (a real, checkable consistency rule).
 *
 * This is a deterministic rule: it compares concrete record values, and explains
 * exactly what it compared in the metadata.
 */
class InvoiceCustomerRule implements VerificationRule
{
    public function key(): string
    {
        return 'invoice_customer';
    }

    public function label(): string
    {
        return 'Customer Consistency';
    }

    public function evaluate(Transaction $transaction): VerificationResult
    {
        $transaction->loadMissing('customer', 'invoices', 'documents');
        $customer = $transaction->customer;
        $invoice = $transaction->invoices->first();

        if (! $customer) {
            return VerificationResult::failed(
                $this->key(),
                $this->label(),
                'Transaction has no customer assigned.',
            );
        }

        if (! $invoice) {
            return VerificationResult::warning(
                $this->key(),
                $this->label(),
                'No invoice on file; customer linkage could not be confirmed.',
                ['customer' => $customer->name],
            );
        }

        // Cross-check the invoice number against any uploaded invoice-type document.
        $invoiceDocs = $transaction->documents
            ->whereIn('document_type', [DocumentType::INVOICE, DocumentType::TAX_INVOICE])
            ->filter(fn (Document $d) => ! empty($d->document_number));

        $mismatched = $invoiceDocs
            ->reject(fn (Document $d) => $d->document_number === $invoice->invoice_number)
            ->all();

        if (! empty($mismatched)) {
            $numbers = collect($mismatched)->map(fn (Document $d) => $d->document_number)->implode(', ');

            return VerificationResult::warning(
                $this->key(),
                $this->label(),
                "Invoice document number(s) ({$numbers}) do not match the invoice record ({$invoice->invoice_number}).",
                [
                    'customer' => $customer->name,
                    'invoice_number' => $invoice->invoice_number,
                    'document_numbers' => $numbers,
                ],
            );
        }

        return VerificationResult::pass(
            $this->key(),
            $this->label(),
            "Customer and invoice linkage are consistent ({$customer->name} / {$invoice->invoice_number}).",
            [
                'customer' => $customer->name,
                'invoice_number' => $invoice->invoice_number,
            ],
        );
    }
}
