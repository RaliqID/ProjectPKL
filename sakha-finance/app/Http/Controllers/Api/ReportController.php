<?php

namespace App\Http\Controllers\Api;

use App\Enums\DeliveryStatus;
use App\Enums\DocumentStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\Document;
use App\Models\Payment;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);

        return response()->json([
            'data' => [
                'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
                'transactions' => $this->transactionSummary($from, $to),
                'payments' => $this->paymentSummary($from, $to),
                'deliveries' => $this->deliverySummary($from, $to),
                'documents' => $this->documentSummary($from, $to),
                'verifications' => $this->verificationSummary($from, $to),
            ],
        ]);
    }

    public function exportTransactions(Request $request)
    {
        [$from, $to] = $this->range($request);

        $rows = Transaction::with('customer')
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('transaction_date')
            ->get();

        return $this->csv('laporan-transaksi', [
            'Kode Transaksi', 'Tanggal', 'Pelanggan', 'Status', 'Subtotal', 'Diskon', 'Pajak', 'Total',
        ], $rows->map(fn (Transaction $t) => [
            $t->transaction_code,
            $t->transaction_date?->toDateString(),
            $t->customer?->name,
            $t->status->label(),
            (string) $t->subtotal,
            (string) $t->discount,
            (string) $t->tax,
            (string) $t->total_amount,
        ]));
    }

    /**
     * Stream rows as a CSV download.
     *
     * A UTF-8 BOM is written so Excel on Windows opens Indonesian characters and
     * the em-dash correctly, and the delimiter is a semicolon because Excel in
     * the id-ID locale treats the comma as a decimal separator.
     *
     * @param  array<int, string>  $headers
     * @param  iterable<int, array<int, scalar|null>>  $rows
     */
    private function csv(string $filename, array $headers, iterable $rows): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $callback = function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel
            fputcsv($out, $headers, ';');

            foreach ($rows as $row) {
                fputcsv($out, $row, ';');
            }

            fclose($out);
        };

        return response()->streamDownload($callback, $filename.'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Render a set of columns/rows to a downloadable PDF.
     *
     * Shared by every PDF export so the header, footer and typography stay
     * identical across reports. Uses dompdf (no headless browser needed).
     *
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, scalar|null>>  $rows
     * @param  array<string, string>  $summary  Label => value pairs shown above the table.
     * @param  array<int, int>  $numericColumns  Column indexes to right-align.
     * @param  string  $orientation  'portrait' or 'landscape'.
     * @param  array{title:string,points:array<int,array{label:string,value:int}>}|null  $trend
     */
    private function pdf(
        string $filename,
        string $title,
        array $headers,
        array $rows,
        string $subtitle = '',
        array $summary = [],
        string $period = '',
        array $numericColumns = [],
        string $orientation = 'portrait',
        ?array $trend = null,
    ): \Illuminate\Http\Response {
        // Embed the logo as a base64 data-URI: dompdf cannot resolve public/
        // paths reliably, and a data-URI always renders.
        $logo = null;
        $logoPath = public_path('sakha-logo.png');
        if (is_file($logoPath)) {
            $logo = 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath));
        }

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.table', [
            'title' => $title,
            'subtitle' => $subtitle,
            'headers' => $headers,
            'rows' => $rows,
            'summary' => $summary,
            'period' => $period,
            'numericColumns' => $numericColumns,
            'trend' => $trend,
            'logo' => $logo,
            'generated_at' => now()->translatedFormat('d F Y, H:i'),
            'generated_by' => request()->user()?->name,
        ])->setPaper('a4', $orientation);

        return $pdf->download($filename.'.pdf');
    }

    /**
     * Build the {label,value} points for a monthly trend chart.
     *
     * @param  array<int, string>  $counts  Month keys (Y-m) already counted.
     * @return array{title:string,points:array<int,array{label:string,value:int}>}
     */
    private function trendPoints(array $countsByMonth, string $title): array
    {
        $points = [];
        foreach ($countsByMonth as $key => $value) {
            $points[] = [
                'label' => \Illuminate\Support\Carbon::parse($key.'-01')->translatedFormat('M Y'),
                'value' => (int) $value,
            ];
        }

        return ['title' => $title, 'points' => $points];
    }

    /**
     * Email a report PDF to the signed-in user.
     *
     * Reuses the same builders as the download endpoints; the only difference is
     * the delivery channel. `type` selects which report to generate.
     */
    public function emailReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:transactions,invoices,archives,expenses,procurements,ketelitian'],
            'email' => ['nullable', 'email'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();
        $to = $validated['email'] ?? $user->email;

        [$bytes, $filename, $title, $summary] = $this->buildReport($validated['type']);

        \Illuminate\Support\Facades\Mail::to($to)->send(new \App\Mail\ScheduledReportMail(
            reportTitle: $title,
            periodLabel: now()->translatedFormat('d F Y, H:i'),
            summary: $summary,
            pdfBytes: $bytes,
            pdfFilename: $filename,
        ));

        app(\App\Services\ActivityLogService::class)->log(
            'report',
            null,
            'report.emailed',
            "Laporan {$title} dikirim ke {$to}",
        );

        return response()->json(['message' => "Laporan dikirim ke {$to}."]);
    }

    /**
     * Generate a report PDF and its summary, shared by the email endpoint.
     *
     * @return array{0: string, 1: string, 2: string, 3: array<string, string>}
     */
    private function buildReport(string $type): array
    {
        $logo = null;
        $logoPath = public_path('sakha-logo.png');
        if (is_file($logoPath)) {
            $logo = 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath));
        }

        $render = function (string $title, array $headers, array $rows, array $summary, array $numeric, string $orientation) use ($logo) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.table', [
                'title' => $title,
                'subtitle' => 'Laporan dikirim melalui email.',
                'headers' => $headers,
                'rows' => $rows,
                'summary' => $summary,
                'period' => '',
                'numericColumns' => $numeric,
                'trend' => null,
                'logo' => $logo,
                'generated_at' => now()->translatedFormat('d F Y, H:i'),
                'generated_by' => request()->user()?->name,
            ])->setPaper('a4', $orientation);

            return $pdf->output();
        };

        switch ($type) {
            case 'invoices':
                $rows = \App\Models\Invoice::with('transaction.customer')->orderByDesc('invoice_date')->get();
                $total = $rows->sum(fn ($i) => (float) $i->amount + (float) $i->tax_amount);
                $summary = ['Jumlah invoice' => (string) $rows->count(), 'Total nilai' => 'Rp '.number_format($total, 0, ',', '.')];
                $bytes = $render('Laporan Invoice', ['Nomor', 'Tanggal', 'Jatuh Tempo', 'Pelanggan', 'Total', 'Status'], $rows->map(fn ($i) => [$i->invoice_number, $i->invoice_date?->format('d/m/Y'), $i->due_date?->format('d/m/Y'), $i->transaction?->customer?->name, 'Rp '.number_format((float) $i->amount + (float) $i->tax_amount, 0, ',', '.'), $i->status->label()])->all(), $summary, [4], 'portrait');

                return [$bytes, 'laporan-invoice.pdf', 'Invoice', $summary];

            case 'archives':
                $rows = \App\Models\Archive::with('customer')->orderByDesc('document_date')->get();
                $summary = ['Jumlah dokumen' => (string) $rows->count()];
                $bytes = $render('Laporan Arsip Dokumen', ['Kode', 'Nama Dokumen', 'Jenis', 'Pelanggan', 'Tanggal', 'Lokasi Arsip'], $rows->map(fn ($a) => [$a->archive_code, $a->document_name, $a->document_type instanceof \App\Enums\DocumentType ? $a->document_type->label() : $a->document_type, $a->customer?->name, $a->document_date?->format('d/m/Y'), $a->archive_location])->all(), $summary, [], 'landscape');

                return [$bytes, 'laporan-arsip.pdf', 'Arsip Dokumen', $summary];

            case 'expenses':
                $rows = \App\Models\Expense::orderByDesc('expense_date')->get();
                $total = $rows->sum(fn ($e) => (float) $e->amount);
                $summary = ['Jumlah catatan' => (string) $rows->count(), 'Total nominal' => 'Rp '.number_format($total, 0, ',', '.')];
                $bytes = $render('Laporan Pengeluaran', ['Kode', 'Tanggal', 'Kendaraan', 'SPBU', 'Nominal', 'Status'], $rows->map(fn ($e) => [$e->expense_code, $e->expense_date?->format('d/m/Y'), $e->vehicle, $e->station, 'Rp '.number_format((float) $e->amount, 0, ',', '.'), $e->status])->all(), $summary, [4], 'portrait');

                return [$bytes, 'laporan-pengeluaran.pdf', 'Pengeluaran', $summary];

            case 'procurements':
                $rows = \App\Models\Procurement::orderByDesc('request_date')->get();
                $total = $rows->sum(fn ($p) => (float) $p->total_amount);
                $summary = ['Jumlah catatan' => (string) $rows->count(), 'Total nilai' => 'Rp '.number_format($total, 0, ',', '.')];
                $bytes = $render('Laporan Pengadaan & SPB', ['Kode', 'No. SPB', 'Tanggal', 'Barang', 'Supplier', 'Jumlah', 'Total', 'Status'], $rows->map(fn ($p) => [$p->procurement_code, $p->spb_number, $p->request_date?->format('d/m/Y'), $p->item_name, $p->supplier, $p->quantity.' '.($p->unit ?? ''), 'Rp '.number_format((float) $p->total_amount, 0, ',', '.'), $p->status])->all(), $summary, [6], 'landscape');

                return [$bytes, 'laporan-pengadaan.pdf', 'Pengadaan', $summary];

            case 'ketelitian':
                $service = app(\App\Services\AccuracyService::class);
                $results = \App\Models\Transaction::with(['customer', 'invoices', 'documents', 'latestVerificationRun'])->whereHas('invoices')->orderByDesc('transaction_date')->get()->map(fn ($t) => $service->check($t));
                $summary = ['Total diperiksa' => (string) $results->count(), 'Sesuai' => (string) $results->where('overall', 'SESUAI')->count(), 'Perlu Diperiksa' => (string) $results->where('overall', 'PERLU_DIPERIKSA')->count()];
                $bytes = $render('Laporan Pemeriksaan Ketelitian', ['Kode Transaksi', 'Pelanggan', 'Sesuai', 'Perlu Diperiksa', 'Tidak Sesuai', 'Hasil'], $results->map(fn ($r) => [$r['transaction_code'], $r['customer'], (string) $r['sesuai'], (string) $r['perlu_diperiksa'], (string) $r['tidak_sesuai'], $r['overall_label']])->all(), $summary, [2, 3, 4], 'portrait');

                return [$bytes, 'laporan-ketelitian.pdf', 'Pemeriksaan Ketelitian', $summary];

            default:
                $rows = \App\Models\Transaction::with('customer')->orderBy('transaction_date')->get();
                $total = $rows->sum(fn ($t) => (float) $t->total_amount);
                $summary = ['Jumlah transaksi' => (string) $rows->count(), 'Total nilai' => 'Rp '.number_format($total, 0, ',', '.')];
                $bytes = $render('Laporan Transaksi', ['Kode', 'Tanggal', 'Pelanggan', 'Status', 'Total'], $rows->map(fn ($t) => [$t->transaction_code, $t->transaction_date?->format('d/m/Y'), $t->customer?->name, $t->status->label(), 'Rp '.number_format((float) $t->total_amount, 0, ',', '.')])->all(), $summary, [4], 'landscape');

                return [$bytes, 'laporan-transaksi.pdf', 'Transaksi', $summary];
        }
    }

    public function pdfTransactions(Request $request): \Illuminate\Http\Response
    {
        [$from, $to] = $this->range($request);

        $rows = Transaction::with('customer')
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('transaction_date')
            ->get();

        $total = $rows->sum(fn (Transaction $t) => (float) $t->total_amount);

        // Monthly trend for the chart block (last 6 months).
        $byMonth = [];
        for ($i = 5; $i >= 0; $i--) {
            $byMonth[now()->subMonths($i)->format('Y-m')] = 0;
        }
        foreach ($rows as $t) {
            $key = $t->transaction_date?->format('Y-m');
            if ($key !== null && array_key_exists($key, $byMonth)) {
                $byMonth[$key]++;
            }
        }

        return $this->pdf(
            'laporan-transaksi',
            'Laporan Transaksi',
            ['Kode', 'Tanggal', 'Pelanggan', 'Status', 'Total'],
            $rows->map(fn (Transaction $t) => [
                $t->transaction_code,
                $t->transaction_date?->format('d/m/Y'),
                $t->customer?->name,
                $t->status->label(),
                'Rp '.number_format((float) $t->total_amount, 0, ',', '.'),
            ])->all(),
            'Daftar transaksi beserta status dan nilainya.',
            ['Jumlah transaksi' => (string) $rows->count(), 'Total nilai' => 'Rp '.number_format($total, 0, ',', '.')],
            $from->format('d/m/Y').' – '.$to->format('d/m/Y'),
            [4],
            'landscape',
            $this->trendPoints($byMonth, 'Jumlah Transaksi per Bulan'),
        );
    }

    public function pdfInvoices(Request $request): \Illuminate\Http\Response
    {
        $rows = \App\Models\Invoice::with('transaction.customer')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('invoice_date')
            ->get();

        $total = $rows->sum(fn ($i) => (float) $i->amount + (float) $i->tax_amount);

        return $this->pdf(
            'laporan-invoice',
            'Laporan Invoice',
            ['Nomor', 'Tanggal', 'Jatuh Tempo', 'Pelanggan', 'Total', 'Status'],
            $rows->map(fn ($i) => [
                $i->invoice_number,
                $i->invoice_date?->format('d/m/Y'),
                $i->due_date?->format('d/m/Y'),
                $i->transaction?->customer?->name,
                'Rp '.number_format((float) $i->amount + (float) $i->tax_amount, 0, ',', '.'),
                $i->status->label(),
            ])->all(),
            'Daftar invoice beserta jatuh tempo dan status pembayaran.',
            ['Jumlah invoice' => (string) $rows->count(), 'Total nilai' => 'Rp '.number_format($total, 0, ',', '.')],
            '',
            [4],
        );
    }

    public function pdfArchives(Request $request): \Illuminate\Http\Response
    {
        $rows = \App\Models\Archive::with(['customer'])
            ->when($request->filled('document_type'), fn ($q) => $q->where('document_type', $request->string('document_type')))
            ->when($request->filled('year'), fn ($q) => $q->where('period_year', (int) $request->input('year')))
            ->orderByDesc('document_date')
            ->get();

        return $this->pdf(
            'laporan-arsip',
            'Laporan Arsip Dokumen',
            ['Kode', 'Nama Dokumen', 'Jenis', 'Pelanggan', 'Tanggal', 'Lokasi Arsip'],
            $rows->map(fn ($a) => [
                $a->archive_code,
                $a->document_name,
                $a->document_type instanceof \App\Enums\DocumentType ? $a->document_type->label() : $a->document_type,
                $a->customer?->name,
                $a->document_date?->format('d/m/Y'),
                $a->archive_location,
            ])->all(),
            'Daftar dokumen yang tersimpan di arsip.',
            ['Jumlah dokumen' => (string) $rows->count()],
            '',
            [],
            'landscape',
        );
    }

    public function pdfExpenses(Request $request): \Illuminate\Http\Response
    {
        $rows = \App\Models\Expense::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('expense_date', '>=', $request->input('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('expense_date', '<=', $request->input('date_to')))
            ->orderByDesc('expense_date')
            ->get();

        $total = $rows->sum(fn ($e) => (float) $e->amount);

        return $this->pdf(
            'laporan-pengeluaran',
            'Laporan Pengeluaran',
            ['Kode', 'Tanggal', 'Kendaraan', 'SPBU', 'Nominal', 'Status'],
            $rows->map(fn ($e) => [
                $e->expense_code,
                $e->expense_date?->format('d/m/Y'),
                $e->vehicle,
                $e->station,
                'Rp '.number_format((float) $e->amount, 0, ',', '.'),
                $e->status,
            ])->all(),
            'Daftar pengeluaran operasional (termasuk klaim bensin).',
            ['Jumlah catatan' => (string) $rows->count(), 'Total nominal' => 'Rp '.number_format($total, 0, ',', '.')],
            '',
            [4],
        );
    }

    public function pdfProcurements(Request $request): \Illuminate\Http\Response
    {
        $rows = \App\Models\Procurement::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('request_date')
            ->get();

        $total = $rows->sum(fn ($p) => (float) $p->total_amount);

        return $this->pdf(
            'laporan-pengadaan',
            'Laporan Pengadaan & SPB',
            ['Kode', 'No. SPB', 'Tanggal', 'Barang', 'Supplier', 'Jumlah', 'Total', 'Status'],
            $rows->map(fn ($p) => [
                $p->procurement_code,
                $p->spb_number,
                $p->request_date?->format('d/m/Y'),
                $p->item_name,
                $p->supplier,
                $p->quantity.' '.($p->unit ?? ''),
                'Rp '.number_format((float) $p->total_amount, 0, ',', '.'),
                $p->status,
            ])->all(),
            'Catatan pengadaan barang dan Buku SPB.',
            ['Jumlah catatan' => (string) $rows->count(), 'Total nilai' => 'Rp '.number_format($total, 0, ',', '.')],
            '',
            [6],
            'landscape',
        );
    }

    public function pdfKetelitian(Request $request): \Illuminate\Http\Response
    {
        $service = app(\App\Services\AccuracyService::class);

        $results = Transaction::with(['customer', 'invoices', 'documents', 'latestVerificationRun'])
            ->whereHas('invoices')
            ->orderByDesc('transaction_date')
            ->get()
            ->map(fn (Transaction $t) => $service->check($t));

        $sesuai = $results->where('overall', 'SESUAI')->count();
        $perlu = $results->where('overall', 'PERLU_DIPERIKSA')->count();
        $tidak = $results->where('overall', 'TIDAK_SESUAI')->count();

        // A snapshot breakdown reads better here than a time series, since the
        // check result is a current state rather than a monthly count.
        $breakdown = [
            'title' => 'Distribusi Hasil Pemeriksaan',
            'points' => [
                ['label' => 'Sesuai', 'value' => $sesuai],
                ['label' => 'Perlu Diperiksa', 'value' => $perlu],
                ['label' => 'Tidak Sesuai', 'value' => $tidak],
            ],
        ];

        return $this->pdf(
            'laporan-pemeriksaan-ketelitian',
            'Laporan Pemeriksaan Ketelitian',
            ['Kode Transaksi', 'Pelanggan', 'Sesuai', 'Perlu Diperiksa', 'Tidak Sesuai', 'Hasil'],
            $results->map(fn ($r) => [
                $r['transaction_code'],
                $r['customer'],
                (string) $r['sesuai'],
                (string) $r['perlu_diperiksa'],
                (string) $r['tidak_sesuai'],
                $r['overall_label'],
            ])->all(),
            'Hasil pemeriksaan ketelitian data transaksi & invoice.',
            ['Total diperiksa' => (string) $results->count(), 'Sesuai' => (string) $sesuai, 'Perlu Diperiksa' => (string) $perlu, 'Tidak Sesuai' => (string) $tidak],
            '',
            [2, 3, 4],
            'portrait',
            $breakdown,
        );
    }

    public function exportInvoices(Request $request)
    {
        $rows = \App\Models\Invoice::with('transaction.customer')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('invoice_date')
            ->get();

        return $this->csv('laporan-invoice', [
            'Nomor Invoice', 'Tanggal', 'Jatuh Tempo', 'Kode Transaksi', 'Pelanggan', 'Nilai', 'Pajak', 'Total', 'Status',
        ], $rows->map(fn ($i) => [
            $i->invoice_number,
            $i->invoice_date?->toDateString(),
            $i->due_date?->toDateString(),
            $i->transaction?->transaction_code,
            $i->transaction?->customer?->name,
            (string) $i->amount,
            (string) $i->tax_amount,
            (string) bcadd((string) $i->amount, (string) $i->tax_amount, 2),
            $i->status->label(),
        ]));
    }

    public function exportArchives(Request $request)
    {
        $rows = \App\Models\Archive::with(['customer', 'transaction'])
            ->when($request->filled('document_type'), fn ($q) => $q->where('document_type', $request->string('document_type')))
            ->when($request->filled('year'), fn ($q) => $q->where('period_year', (int) $request->input('year')))
            ->orderByDesc('document_date')
            ->get();

        return $this->csv('laporan-arsip', [
            'Kode Arsip', 'Nama Dokumen', 'Nomor', 'Jenis', 'Pelanggan', 'Tanggal', 'Tahun', 'Bulan', 'Lokasi Arsip', 'Status',
        ], $rows->map(fn ($a) => [
            $a->archive_code,
            $a->document_name,
            $a->document_number,
            $a->document_type instanceof \App\Enums\DocumentType ? $a->document_type->label() : $a->document_type,
            $a->customer?->name,
            $a->document_date?->toDateString(),
            $a->period_year,
            $a->period_month,
            $a->archive_location,
            $a->status,
        ]));
    }

    public function exportExpenses(Request $request)
    {
        $rows = \App\Models\Expense::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('expense_date')
            ->get();

        return $this->csv('laporan-pengeluaran', [
            'Kode', 'Tanggal', 'Kategori', 'Kendaraan', 'Kilometer', 'SPBU', 'Jenis BBM', 'Nominal', 'No. Bukti', 'Status',
        ], $rows->map(fn ($e) => [
            $e->expense_code,
            $e->expense_date?->toDateString(),
            $e->category,
            $e->vehicle,
            $e->odometer_km,
            $e->station,
            $e->fuel_type,
            (string) $e->amount,
            $e->proof_reference,
            $e->status,
        ]));
    }

    public function exportProcurements(Request $request)
    {
        $rows = \App\Models\Procurement::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('request_date')
            ->get();

        return $this->csv('laporan-pengadaan', [
            'Kode', 'Nomor SPB', 'Tanggal', 'Barang', 'Marketplace/Supplier', 'Harga Satuan', 'Jumlah', 'Satuan', 'Divisi', 'Total', 'Resi', 'Status',
        ], $rows->map(fn ($p) => [
            $p->procurement_code,
            $p->spb_number,
            $p->request_date?->toDateString(),
            $p->item_name,
            $p->supplier,
            (string) $p->unit_price,
            $p->quantity,
            $p->unit,
            $p->division,
            (string) $p->total_amount,
            $p->tracking_number,
            $p->status,
        ]));
    }

    /**
     * Pemeriksaan Ketelitian export: one row per transaction with its overall
     * result and a per-criterion summary.
     */
    public function exportKetelitian(Request $request)
    {
        $service = app(\App\Services\AccuracyService::class);

        $rows = Transaction::with(['customer', 'invoices', 'documents', 'latestVerificationRun'])
            ->whereHas('invoices')
            ->orderByDesc('transaction_date')
            ->get()
            ->map(fn (Transaction $t) => $service->check($t));

        return $this->csv('laporan-pemeriksaan-ketelitian', [
            'Kode Transaksi', 'Pelanggan', 'Jumlah Pemeriksaan', 'Sesuai', 'Perlu Diperiksa', 'Tidak Sesuai', 'Hasil',
        ], $rows->map(fn ($r) => [
            $r['transaction_code'],
            $r['customer'],
            $r['total'],
            $r['sesuai'],
            $r['perlu_diperiksa'],
            $r['tidak_sesuai'],
            $r['overall_label'],
        ]));
    }

    /**
     * Detailed accuracy export: one row per check, so findings can be filtered
     * and analysed criterion by criterion in a spreadsheet.
     */
    public function exportKetelitianDetail(Request $request)
    {
        $service = app(\App\Services\AccuracyService::class);

        $transactions = Transaction::with(['customer', 'invoices', 'documents', 'latestVerificationRun'])
            ->whereHas('invoices')
            ->orderByDesc('transaction_date')
            ->get();

        $rows = [];
        foreach ($transactions as $transaction) {
            $result = $service->check($transaction);

            foreach ($result['checks'] as $check) {
                $rows[] = [
                    $result['transaction_code'],
                    $result['customer'],
                    $check['label'],
                    $check['status_label'],
                    $check['message'],
                    $check['expected'] ?? '',
                    $check['actual'] ?? '',
                    $result['overall_label'],
                ];
            }
        }

        return $this->csv('laporan-ketelitian-detail', [
            'Kode Transaksi', 'Pelanggan', 'Kriteria', 'Hasil', 'Keterangan', 'Seharusnya', 'Tercatat', 'Hasil Keseluruhan',
        ], $rows);
    }

    private function range(Request $request): array
    {
        $from = $request->filled('date_from') ? \Carbon\Carbon::parse($request->input('date_from')) : now()->startOfMonth();
        $to = $request->filled('date_to') ? \Carbon\Carbon::parse($request->input('date_to')) : now();

        return [$from->startOfDay(), $to->endOfDay()];
    }

    private function transactionSummary($from, $to): array
    {
        $transactions = Transaction::whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])->get();

        return [
            'count' => $transactions->count(),
            'total_amount' => (string) number_format($transactions->sum(fn ($t) => (float) $t->total_amount), 2, '.', ''),
            'completed' => $transactions->where('status', \App\Enums\TransactionStatus::COMPLETED)->count(),
            'needs_review' => $transactions->where('status', \App\Enums\TransactionStatus::NEEDS_REVIEW)->count(),
        ];
    }

    private function paymentSummary($from, $to): array
    {
        $payments = Payment::whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])->get();

        return [
            'count' => $payments->count(),
            'confirmed_amount' => (string) number_format($payments->where('status', PaymentStatus::CONFIRMED)->sum(fn ($p) => (float) $p->amount), 2, '.', ''),
            'pending_amount' => (string) number_format($payments->where('status', PaymentStatus::PENDING)->sum(fn ($p) => (float) $p->amount), 2, '.', ''),
            'rejected_count' => $payments->where('status', PaymentStatus::REJECTED)->count(),
        ];
    }

    private function deliverySummary($from, $to): array
    {
        $deliveries = Delivery::where(function ($q) use ($from, $to) {
            $q->whereBetween('shipping_date', [$from->toDateString(), $to->toDateString()])
                ->orWhereBetween('estimated_delivery_date', [$from->toDateString(), $to->toDateString()]);
        })->get();

        return [
            'count' => $deliveries->count(),
            'delivered' => $deliveries->where('status', DeliveryStatus::DELIVERED)->count(),
            'in_transit' => $deliveries->whereIn('status', [DeliveryStatus::SHIPPED, DeliveryStatus::IN_TRANSIT])->count(),
            'failed' => $deliveries->whereIn('status', [DeliveryStatus::FAILED, DeliveryStatus::RETURNED])->count(),
            'delayed' => $deliveries->filter(fn (Delivery $d) => $d->isDelayed())->count(),
        ];
    }

    private function documentSummary($from, $to): array
    {
        $documents = Document::whereBetween('created_at', [$from, $to])->get();

        return [
            'count' => $documents->count(),
            'verified' => $documents->where('status', DocumentStatus::VERIFIED)->count(),
            'pending' => $documents->whereIn('status', [DocumentStatus::UPLOADED, DocumentStatus::UNDER_REVIEW])->count(),
            'rejected' => $documents->where('status', DocumentStatus::REJECTED)->count(),
            'by_type' => $documents->groupBy(fn (Document $d) => $d->document_type->value)->map->count(),
        ];
    }

    private function verificationSummary($from, $to): array
    {
        $runs = \App\Models\VerificationRun::whereBetween('created_at', [$from, $to])->get();

        return [
            'count' => $runs->count(),
            'passed' => $runs->where('overall_status', 'PASS')->count(),
            'warnings' => $runs->where('overall_status', 'WARNING')->count(),
            'failed' => $runs->where('overall_status', 'FAILED')->count(),
            'average_score' => $runs->count() ? round($runs->avg('score')) : 0,
        ];
    }
}
