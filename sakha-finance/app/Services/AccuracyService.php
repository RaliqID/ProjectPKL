<?php

namespace App\Services;

use App\Enums\DocumentStatus;
use App\Enums\DocumentType;
use App\Enums\InvoiceStatus;
use App\Enums\VerificationStatus;
use App\Models\Transaction;

/**
 * Pemeriksaan Ketelitian — accuracy checking of sales invoice input.
 *
 * This encodes the deterministic checks performed when filling the
 * "Dashboard Ketelitian Input Sales Invoice" during the internship: does the
 * customer match, is the invoice number present and consistent, is the date
 * plausible, does the amount reconcile with the transaction, and are the
 * required documents attached.
 *
 * Unlike the transactional verification engine (which persists a run), this is
 * a read-only audit that can be computed on demand for any record. Rules are
 * fixed and explainable — no AI, no heuristics.
 */
class AccuracyService
{
    /**
     * Evaluate one transaction and return a per-check breakdown plus an overall
     * result.
     *
     * @return array{
     *     transaction_id:int,
     *     transaction_code:string,
     *     customer:?string,
     *     overall:string,
     *     overall_label:string,
     *     total:int,
     *     sesuai:int,
     *     perlu_diperiksa:int,
     *     tidak_sesuai:int,
     *     checks:array<int, array{key:string,label:string,status:string,status_label:string,message:string,expected:?string,actual:?string}>
     * }
     */
    public function check(Transaction $transaction): array
    {
        $transaction->loadMissing(['customer', 'invoices', 'documents', 'latestVerificationRun']);

        $checks = [
            $this->checkCustomer($transaction),
            $this->checkInvoiceNumber($transaction),
            $this->checkInvoiceDate($transaction),
            $this->checkAmount($transaction),
            $this->checkDocuments($transaction),
        ];

        $counts = ['SESUAI' => 0, 'PERLU_DIPERIKSA' => 0, 'TIDAK_SESUAI' => 0];
        foreach ($checks as $c) {
            $counts[$c['status']]++;
        }

        $overall = $this->overall($checks);

        return [
            'transaction_id' => $transaction->id,
            'transaction_code' => $transaction->transaction_code,
            'customer' => $transaction->customer?->name,
            'overall' => $overall,
            'overall_label' => $this->statusLabel($overall),
            'total' => count($checks),
            'sesuai' => $counts['SESUAI'],
            'perlu_diperiksa' => $counts['PERLU_DIPERIKSA'],
            'tidak_sesuai' => $counts['TIDAK_SESUAI'],
            'checks' => $checks,
        ];
    }

    /**
     * @return array{key:string,label:string,status:string,status_label:string,message:string,expected:?string,actual:?string}
     */
    private function checkCustomer(Transaction $transaction): array
    {
        $hasCustomer = $transaction->customer !== null;
        $invoices = $transaction->invoices;

        if (! $hasCustomer) {
            return $this->result('customer', 'Pelanggan', 'TIDAK_SESUAI', 'Transaksi belum memiliki pelanggan.');
        }

        // Every invoice must belong to the same customer as the transaction.
        $mismatched = $invoices->filter(fn ($inv) => $inv->customer_id !== null && $inv->customer_id !== $transaction->customer_id);

        if ($mismatched->isNotEmpty()) {
            return $this->result(
                'customer',
                'Pelanggan',
                'TIDAK_SESUAI',
                'Pelanggan pada invoice tidak sama dengan pelanggan transaksi.',
                $transaction->customer->name,
                $mismatched->first()->customer?->name ?? '-',
            );
        }

        return $this->result('customer', 'Pelanggan', 'SESUAI', 'Pelanggan sesuai dengan transaksi.', null, $transaction->customer->name);
    }

    private function checkInvoiceNumber(Transaction $transaction): array
    {
        $invoices = $transaction->invoices;

        if ($invoices->isEmpty()) {
            return $this->result('invoice_number', 'Nomor Invoice', 'TIDAK_SESUAI', 'Transaksi belum memiliki invoice.');
        }

        $missing = $invoices->filter(fn ($inv) => blank($inv->invoice_number));
        if ($missing->isNotEmpty()) {
            return $this->result('invoice_number', 'Nomor Invoice', 'TIDAK_SESUAI', 'Ada invoice tanpa nomor.');
        }

        $duplicates = $invoices->groupBy('invoice_number')->filter(fn ($g) => $g->count() > 1);
        if ($duplicates->isNotEmpty()) {
            return $this->result('invoice_number', 'Nomor Invoice', 'PERLU DIPERIKSA', 'Ada nomor invoice yang duplikat dalam transaksi.');
        }

        return $this->result('invoice_number', 'Nomor Invoice', 'SESUAI', 'Nomor invoice terisi dan unik.', null, $invoices->first()->invoice_number);
    }

    private function checkInvoiceDate(Transaction $transaction): array
    {
        $invoices = $transaction->invoices;

        if ($invoices->isEmpty()) {
            return $this->result('invoice_date', 'Tanggal Invoice', 'TIDAK_SESUAI', 'Transaksi belum memiliki invoice.');
        }

        foreach ($invoices as $invoice) {
            if ($invoice->invoice_date === null) {
                return $this->result('invoice_date', 'Tanggal Invoice', 'PERLU DIPERIKSA', 'Ada invoice tanpa tanggal.');
            }
            // An invoice dated before the transaction is suspicious.
            if ($invoice->invoice_date->lt($transaction->transaction_date)) {
                return $this->result(
                    'invoice_date',
                    'Tanggal Invoice',
                    'TIDAK_SESUAI',
                    'Tanggal invoice lebih awal dari tanggal transaksi.',
                    $transaction->transaction_date?->format('d/m/Y'),
                    $invoice->invoice_date->format('d/m/Y'),
                );
            }
        }

        return $this->result(
            'invoice_date',
            'Tanggal Invoice',
            'SESUAI',
            'Tanggal invoice wajar terhadap transaksi.',
            null,
            $invoices->first()->invoice_date?->format('d/m/Y'),
        );
    }

    private function checkAmount(Transaction $transaction): array
    {
        $invoices = $transaction->invoices;

        if ($invoices->isEmpty()) {
            return $this->result('amount', 'Nilai Invoice', 'TIDAK_SESUAI', 'Transaksi belum memiliki invoice.');
        }

        $invoiceTotal = $invoices->reduce(fn ($carry, $inv) => bcadd($carry, bcadd((string) $inv->amount, (string) $inv->tax_amount, 2), 2), '0.00');
        $transactionTotal = (string) $transaction->total_amount;
        $diff = bcsub($invoiceTotal, $transactionTotal, 2);

        if (bccomp($diff, '0', 2) === 0) {
            return $this->result('amount', 'Nilai Invoice', 'SESUAI', 'Nilai invoice sama dengan nilai transaksi.', null, $invoiceTotal);
        }

        return $this->result(
            'amount',
            'Nilai Invoice',
            'PERLU DIPERIKSA',
            'Nilai invoice berbeda dari nilai transaksi (selisih Rp '.number_format(abs((float) $diff), 0, ',', '.').').',
            $transactionTotal,
            $invoiceTotal,
        );
    }

    private function checkDocuments(Transaction $transaction): array
    {
        // Use the configurable required-document rules (Settings page) rather than
        // a hardcoded list, so "ketelitian" agrees with what the verification
        // engine and the settings screen consider required.
        $required = \App\Models\RequiredDocumentRule::requiredTypes();

        if (empty($required)) {
            return $this->result('documents', 'Kelengkapan Dokumen', 'SESUAI', 'Tidak ada dokumen wajib yang ditetapkan.');
        }

        $present = $transaction->documents
            ->where('status', '!=', DocumentStatus::REJECTED)
            ->pluck('document_type')
            ->map(fn ($t) => $t instanceof DocumentType ? $t->value : $t)
            ->unique()
            ->all();

        $missing = array_values(array_filter(
            $required,
            fn (string $v) => ! in_array($v, $present, true),
        ));

        if (empty($missing)) {
            return $this->result('documents', 'Kelengkapan Dokumen', 'SESUAI', 'Dokumen wajib sudah lengkap.');
        }

        $labels = implode(', ', array_map(
            fn (string $v) => DocumentType::tryFrom($v)?->label() ?? $v,
            $missing,
        ));

        // One missing document is a follow-up ("Perlu Diperiksa"); two or more
        // means the file is materially incomplete ("Tidak Sesuai").
        $status = count($missing) === 1 ? 'PERLU_DIPERIKSA' : 'TIDAK_SESUAI';
        $suffix = count($missing) === 1 ? ' (perlu dilengkapi)' : '';

        return $this->result('documents', 'Kelengkapan Dokumen', $status, "Dokumen belum lengkap: {$labels}.{$suffix}");
    }

    /**
     * @param  array<int, array{status:string}>  $checks
     */
    private function overall(array $checks): string
    {
        $sesuai = 0;
        $perlu = 0;
        $tidak = 0;

        foreach ($checks as $c) {
            match ($c['status']) {
                'SESUAI' => $sesuai++,
                'PERLU_DIPERIKSA' => $perlu++,
                default => $tidak++,
            };
        }

        // Grading rule (deterministic, explainable):
        //  - any "Tidak Sesuai"  -> TIDAK_SESUAI
        //  - otherwise any "Perlu Diperiksa" -> PERLU_DIPERIKSA
        //  - otherwise SESUAI
        // "Tidak Sesuai" means a hard mismatch (wrong customer, missing document,
        // value diverges). "Perlu Diperiksa" is a softer signal (missing date on
        // one invoice, duplicate number) that a person should confirm.
        if ($tidak > 0) {
            return 'TIDAK_SESUAI';
        }
        if ($perlu > 0) {
            return 'PERLU_DIPERIKSA';
        }

        return 'SESUAI';
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'SESUAI' => 'Sesuai',
            'PERLU_DIPERIKSA' => 'Perlu Diperiksa',
            default => 'Tidak Sesuai',
        };
    }

    /**
     * @return array{key:string,label:string,status:string,status_label:string,message:string,expected:?string,actual:?string}
     */
    private function result(string $key, string $label, string $status, string $message, ?string $expected = null, ?string $actual = null): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'status' => $status,
            'status_label' => $this->statusLabel($status),
            'message' => $message,
            'expected' => $expected,
            'actual' => $actual,
        ];
    }
}
