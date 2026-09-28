<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Transaction;

/**
 * Pencocokan Pembayaran — matches payments against the invoice they settle.
 *
 * Produces one of three outcomes per transaction: SESUAI (paid exactly),
 * PERLU DIPERIKSA (a difference remains, in either direction), or TIDAK SESUAI
 * (no payment recorded against an issued invoice at all). Every difference is
 * reported as an explicit rupiah amount so the user sees what is off, not just
 * that something is off.
 */
class PaymentMatchService
{
    /**
     * @return array{
     *     transaction_id:int,
     *     transaction_code:string,
     *     customer:?string,
     *     invoiced:string,
     *     paid:string,
     *     difference:string,
     *     difference_label:string,
     *     status:string,
     *     status_label:string,
     *     note:string
     * }
     */
    public function match(Transaction $transaction): array
    {
        $transaction->loadMissing(['customer', 'invoices', 'payments']);

        $invoiced = $this->invoicedTotal($transaction);
        $paid = $transaction->confirmedPaidAmount();

        $difference = bcsub($invoiced, $paid, 2);
        $absDiff = abs((float) $difference);
        $formatted = 'Rp '.number_format($absDiff, 0, ',', '.');

        // Decide the outcome.
        if (bccomp($difference, '0', 2) === 0) {
            $status = 'SESUAI';
            $note = 'Nilai pembayaran sama dengan nilai invoice.';
        } elseif (bccomp($invoiced, '0', 2) > 0 && bccomp($paid, '0', 2) === 0) {
            $status = 'TIDAK_SESUAI';
            $note = 'Belum ada pembayaran tercatat untuk invoice ini.';
        } elseif (bccomp($difference, '0', 2) > 0) {
            $status = 'PERLU_DIPERIKSA';
            $note = "Pembayaran kurang {$formatted} dari nilai invoice.";
        } else {
            $status = 'PERLU_DIPERIKSA';
            $note = "Pembayaran lebih {$formatted} dari nilai invoice.";
        }

        return [
            'transaction_id' => $transaction->id,
            'transaction_code' => $transaction->transaction_code,
            'customer' => $transaction->customer?->name,
            'invoiced' => $invoiced,
            'paid' => $paid,
            'difference' => $difference,
            'difference_label' => $this->formatIDR($difference),
            'status' => $status,
            'status_label' => $this->statusLabel($status),
            'note' => $note,
        ];
    }

    private function invoicedTotal(Transaction $transaction): string
    {
        return $transaction->invoices->reduce(
            fn ($carry, Invoice $inv) => bcadd($carry, bcadd((string) $inv->amount, (string) $inv->tax_amount, 2), 2),
            '0.00',
        );
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'SESUAI' => 'Sesuai',
            'PERLU_DIPERIKSA' => 'Perlu Diperiksa',
            default => 'Tidak Sesuai',
        };
    }

    private function formatIDR(string $value): string
    {
        $negative = bccomp($value, '0', 2) < 0;

        return ($negative ? '-' : '').'Rp '.number_format(abs((float) $value), 0, ',', '.');
    }
}
