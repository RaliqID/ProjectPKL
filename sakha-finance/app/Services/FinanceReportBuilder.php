<?php

namespace App\Services;

use App\Models\Archive;
use App\Models\Document;
use App\Models\Delivery;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Procurement;
use App\Models\Transaction;
use App\Enums\DeliveryStatus;
use App\Enums\DocumentStatus;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use Illuminate\Support\Carbon;

/**
 * Single source of truth for the report datasets.
 *
 * PDF, CSV and Excel exports all render the SAME structured data from here, so
 * a column can never drift between formats. Each report is described once:
 * title, headers, typed rows, and a label/value summary.
 */
class FinanceReportBuilder
{
    public function __construct(private readonly ExcelReportService $excel = new ExcelReportService()) {}

    /**
     * All report definitions, keyed by the type used in the API.
     *
     * @return array<int, string>
     */
    public static function types(): array
    {
        return ['transactions', 'invoices', 'archives', 'expenses', 'procurements', 'ketelitian'];
    }

    /**
     * Build a report as a normalised structure every exporter can consume.
     *
     * @return array{
     *     title:string,
     *     headers:array<int,string>,
     *     rows:array<int,array<int,mixed>>,
     *     types:array<int,string>,
     *     summary:array<string,string>,
     *     period:string,
     *     landscape:bool
     * }
     */
    public function build(string $type, ?Carbon $from = null, ?Carbon $to = null): array
    {
        return match ($type) {
            'invoices' => $this->invoices(),
            'archives' => $this->archives(),
            'expenses' => $this->expenses($from, $to),
            'procurements' => $this->procurements(),
            'ketelitian' => $this->ketelitian(),
            default => $this->transactions($from ?? now()->startOfMonth(), $to ?? now()),
        };
    }

    /** @return array<string,mixed> */
    private function transactions(Carbon $from, Carbon $to): array
    {
        $models = Transaction::with('customer')
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('transaction_date')
            ->get();

        $rows = $models->map(fn (Transaction $t) => [
            $t->transaction_code,
            $t->transaction_date,
            $t->customer?->name ?? '-',
            $t->status->label(),
            (float) $t->total_amount,
        ])->all();

        $total = $models->sum(fn (Transaction $t) => (float) $t->total_amount);

        return [
            'title' => 'Laporan Transaksi',
            'headers' => ['Kode', 'Tanggal', 'Pelanggan', 'Status', 'Total'],
            'rows' => $rows,
            'types' => ['Text', 'Date', 'Text', 'Text', 'Money'],
            'summary' => [
                'Jumlah transaksi' => (string) $models->count(),
                'Total nilai' => 'Rp '.number_format($total, 0, ',', '.'),
            ],
            'period' => $from->format('d/m/Y').' - '.$to->format('d/m/Y'),
            'landscape' => true,
            'trend' => $this->monthlyTrend($models->pluck('transaction_date'), 'Jumlah Transaksi per Bulan'),
        ];
    }

    /** @return array<string,mixed> */
    private function invoices(): array
    {
        $models = Invoice::with('transaction.customer')->orderByDesc('invoice_date')->get();

        $rows = $models->map(fn (Invoice $i) => [
            $i->invoice_number,
            $i->invoice_date,
            $i->due_date,
            $i->transaction?->customer?->name ?? '-',
            (float) $i->amount + (float) $i->tax_amount,
            $i->status->label(),
        ])->all();

        $total = $models->sum(fn (Invoice $i) => (float) $i->amount + (float) $i->tax_amount);

        return [
            'title' => 'Laporan Invoice',
            'headers' => ['Nomor', 'Tanggal', 'Jatuh Tempo', 'Pelanggan', 'Total', 'Status'],
            'rows' => $rows,
            'types' => ['Text', 'Date', 'Date', 'Text', 'Money', 'Text'],
            'summary' => [
                'Jumlah invoice' => (string) $models->count(),
                'Total nilai' => 'Rp '.number_format($total, 0, ',', '.'),
            ],
            'period' => '',
            'landscape' => false,
            'trend' => null,
        ];
    }

    /** @return array<string,mixed> */
    private function archives(): array
    {
        $models = Archive::with('customer')->orderByDesc('document_date')->get();

        $rows = $models->map(fn (Archive $a) => [
            $a->archive_code,
            $a->document_name,
            $a->document_type?->label() ?? '-',
            $a->customer?->name ?? '-',
            $a->document_date,
            $a->archive_location ?? '-',
        ])->all();

        return [
            'title' => 'Laporan Arsip Dokumen',
            'headers' => ['Kode', 'Nama Dokumen', 'Jenis', 'Pelanggan', 'Tanggal', 'Lokasi Arsip'],
            'rows' => $rows,
            'types' => ['Text', 'Text', 'Text', 'Text', 'Date', 'Text'],
            'summary' => ['Jumlah dokumen' => (string) $models->count()],
            'period' => '',
            'landscape' => true,
            'trend' => null,
        ];
    }

    /** @return array<string,mixed> */
    private function expenses(?Carbon $from, ?Carbon $to): array
    {
        $models = Expense::query()
            ->when($from, fn ($q) => $q->whereDate('expense_date', '>=', $from->toDateString()))
            ->when($to, fn ($q) => $q->whereDate('expense_date', '<=', $to->toDateString()))
            ->orderByDesc('expense_date')
            ->get();

        $rows = $models->map(fn (Expense $e) => [
            $e->expense_code,
            $e->expense_date,
            $e->vehicle ?? '-',
            $e->station ?? '-',
            $e->fuel_type ?? '-',
            (float) $e->amount,
            $e->status,
        ])->all();

        $total = $models->sum(fn (Expense $e) => (float) $e->amount);

        return [
            'title' => 'Laporan Pengeluaran',
            'headers' => ['Kode', 'Tanggal', 'Kendaraan', 'SPBU', 'Jenis BBM', 'Nominal', 'Status'],
            'rows' => $rows,
            'types' => ['Text', 'Date', 'Text', 'Text', 'Text', 'Money', 'Text'],
            'summary' => [
                'Jumlah catatan' => (string) $models->count(),
                'Total nominal' => 'Rp '.number_format($total, 0, ',', '.'),
            ],
            'period' => '',
            'landscape' => false,
            'trend' => null,
        ];
    }

    /** @return array<string,mixed> */
    private function procurements(): array
    {
        $models = Procurement::orderByDesc('request_date')->get();

        $rows = $models->map(fn (Procurement $p) => [
            $p->procurement_code,
            $p->spb_number ?? '-',
            $p->request_date,
            $p->item_name,
            $p->supplier ?? '-',
            $p->quantity.' '.($p->unit ?? ''),
            (float) $p->total_amount,
            $p->status,
        ])->all();

        $total = $models->sum(fn (Procurement $p) => (float) $p->total_amount);

        return [
            'title' => 'Laporan Pengadaan & SPB',
            'headers' => ['Kode', 'No. SPB', 'Tanggal', 'Barang', 'Supplier', 'Jumlah', 'Total', 'Status'],
            'rows' => $rows,
            'types' => ['Text', 'Text', 'Date', 'Text', 'Text', 'Text', 'Money', 'Text'],
            'summary' => [
                'Jumlah catatan' => (string) $models->count(),
                'Total nilai' => 'Rp '.number_format($total, 0, ',', '.'),
            ],
            'period' => '',
            'landscape' => true,
            'trend' => null,
        ];
    }

    /** @return array<string,mixed> */
    private function ketelitian(): array
    {
        $service = app(AccuracyService::class);

        $results = Transaction::with(['customer', 'invoices', 'documents', 'latestVerificationRun'])
            ->whereHas('invoices')
            ->orderByDesc('transaction_date')
            ->get()
            ->map(fn (Transaction $t) => $service->check($t));

        $rows = $results->map(fn ($r) => [
            $r['transaction_code'],
            $r['customer'] ?? '-',
            (int) $r['sesuai'],
            (int) $r['perlu_diperiksa'],
            (int) $r['tidak_sesuai'],
            $r['overall_label'],
        ])->all();

        $sesuai = $results->where('overall', 'SESUAI')->count();
        $perlu = $results->where('overall', 'PERLU_DIPERIKSA')->count();
        $tidak = $results->where('overall', 'TIDAK_SESUAI')->count();

        return [
            'title' => 'Laporan Pemeriksaan Ketelitian',
            'headers' => ['Kode Transaksi', 'Pelanggan', 'Sesuai', 'Perlu Diperiksa', 'Tidak Sesuai', 'Hasil'],
            'rows' => $rows,
            'types' => ['Text', 'Text', 'Int', 'Int', 'Int', 'Text'],
            'summary' => [
                'Total diperiksa' => (string) $results->count(),
                'Sesuai' => (string) $sesuai,
                'Perlu Diperiksa' => (string) $perlu,
                'Tidak Sesuai' => (string) $tidak,
            ],
            'period' => '',
            'landscape' => false,
            'trend' => [
                'title' => 'Distribusi Hasil Pemeriksaan',
                'points' => [
                    ['label' => 'Sesuai', 'value' => $sesuai],
                    ['label' => 'Perlu Diperiksa', 'value' => $perlu],
                    ['label' => 'Tidak Sesuai', 'value' => $tidak],
                ],
            ],
        ];
    }

    /**
     * Monthly counts for the last six months, for the PDF chart block.
     *
     * @param  \Illuminate\Support\Collection<int, mixed>  $dates
     * @return array{title:string,points:array<int,array{label:string,value:int}>}
     */
    private function monthlyTrend($dates, string $title): array
    {
        $buckets = [];
        for ($i = 5; $i >= 0; $i--) {
            $buckets[now()->subMonths($i)->format('Y-m')] = 0;
        }

        foreach ($dates as $date) {
            if (! $date) {
                continue;
            }
            $key = Carbon::parse($date)->format('Y-m');
            if (array_key_exists($key, $buckets)) {
                $buckets[$key]++;
            }
        }

        $points = [];
        foreach ($buckets as $key => $value) {
            $points[] = ['label' => Carbon::parse($key.'-01')->translatedFormat('M Y'), 'value' => $value];
        }

        return ['title' => $title, 'points' => $points];
    }

    /**
     * Dashboard summaries for the reports index page.
     *
     * @return array<string,mixed>
     */
    public function summaries(Carbon $from, Carbon $to): array
    {
        return [
            'transactions' => [
                'count' => Transaction::whereBetween('transaction_date', [$from, $to])->count(),
                'value' => (string) Transaction::whereBetween('transaction_date', [$from, $to])->sum('total_amount'),
            ],
            'payments' => [
                'count' => Payment::whereBetween('payment_date', [$from, $to])->count(),
                'confirmed' => (string) Payment::whereBetween('payment_date', [$from, $to])
                    ->where('status', PaymentStatus::CONFIRMED)->sum('amount'),
            ],
            'deliveries' => [
                'active' => Delivery::whereIn('status', [DeliveryStatus::PREPARING, DeliveryStatus::SHIPPED, DeliveryStatus::IN_TRANSIT])->count(),
                'delivered' => Delivery::where('status', DeliveryStatus::DELIVERED)->count(),
            ],
            'documents' => [
                'pending' => Document::whereIn('status', [DocumentStatus::UPLOADED, DocumentStatus::UNDER_REVIEW])->count(),
                'archived' => Document::where('status', DocumentStatus::ARCHIVED)->count(),
            ],
            'invoices' => [
                'overdue' => Invoice::where('status', InvoiceStatus::OVERDUE)->count(),
                'unpaid' => Invoice::whereIn('status', [InvoiceStatus::ISSUED, InvoiceStatus::PARTIALLY_PAID])->count(),
            ],
            'transactions_completed' => Transaction::where('status', TransactionStatus::COMPLETED)->count(),
        ];
    }
}
