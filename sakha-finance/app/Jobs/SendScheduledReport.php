<?php

namespace App\Jobs;

use App\Mail\ScheduledReportMail;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

/**
 * Build a periodic Finance report PDF and email it to the administrators.
 *
 * Queued so the scheduler stays responsive and a slow mail server cannot block
 * it. The report is a summary of transactions/invoices for the period, using
 * the same PDF template as the on-demand exports so the two never drift.
 */
class SendScheduledReport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        /** 'daily' | 'weekly' | 'monthly' */
        public string $frequency = 'monthly',
    ) {}

    public function handle(): void
    {
        [$from, $to, $label] = $this->period();

        $transactions = \App\Models\Transaction::with('customer')
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('transaction_date')
            ->get();

        $invoices = \App\Models\Invoice::query()
            ->whereBetween('invoice_date', [$from->toDateString(), $to->toDateString()])
            ->get();

        $payments = \App\Models\Payment::query()
            ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
            ->where('status', \App\Enums\PaymentStatus::CONFIRMED)
            ->get();

        $totalTransactions = $transactions->sum(fn ($t) => (float) $t->total_amount);
        $totalPaid = $payments->sum(fn ($p) => (float) $p->amount);

        $rows = $transactions->map(fn ($t) => [
            $t->transaction_code,
            $t->transaction_date?->format('d/m/Y'),
            $t->customer?->name,
            $t->status->label(),
            'Rp '.number_format((float) $t->total_amount, 0, ',', '.'),
        ])->all();

        $summary = [
            'Jumlah transaksi' => (string) $transactions->count(),
            'Total nilai transaksi' => 'Rp '.number_format($totalTransactions, 0, ',', '.'),
            'Jumlah invoice' => (string) $invoices->count(),
            'Pembayaran terkonfirmasi' => 'Rp '.number_format($totalPaid, 0, ',', '.'),
        ];

        // Monthly trend for the chart block.
        $byMonth = [];
        for ($i = 5; $i >= 0; $i--) {
            $byMonth[now()->subMonths($i)->format('Y-m')] = 0;
        }
        foreach ($transactions as $t) {
            $key = $t->transaction_date?->format('Y-m');
            if ($key !== null && array_key_exists($key, $byMonth)) {
                $byMonth[$key]++;
            }
        }
        $trendPoints = [];
        foreach ($byMonth as $key => $value) {
            $trendPoints[] = ['label' => Carbon::parse($key.'-01')->translatedFormat('M Y'), 'value' => (int) $value];
        }

        $logo = null;
        $logoPath = public_path('sakha-logo.png');
        if (is_file($logoPath)) {
            $logo = 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath));
        }

        $pdf = Pdf::loadView('reports.table', [
            'title' => 'Laporan Transaksi ('.$this->frequencyLabel().')',
            'subtitle' => 'Laporan otomatis periode '.$label.'.',
            'headers' => ['Kode', 'Tanggal', 'Pelanggan', 'Status', 'Total'],
            'rows' => $rows,
            'summary' => $summary,
            'period' => $label,
            'numericColumns' => [4],
            'trend' => ['title' => 'Jumlah Transaksi per Bulan', 'points' => $trendPoints],
            'logo' => $logo,
            'generated_at' => now()->translatedFormat('d F Y, H:i'),
            'generated_by' => 'Sistem (terjadwal)',
        ])->setPaper('a4', 'landscape');

        $bytes = $pdf->output();
        $filename = 'laporan-transaksi-'.$from->format('Ymd').'-'.$to->format('Ymd').'.pdf';

        $recipients = User::query()
            ->where('is_active', true)
            ->where('role', \App\Enums\UserRole::ADMIN)
            ->get();

        foreach ($recipients as $user) {
            Mail::to($user->email)->send(new ScheduledReportMail(
                reportTitle: 'Transaksi ('.$this->frequencyLabel().')',
                periodLabel: $label,
                summary: $summary,
                pdfBytes: $bytes,
                pdfFilename: $filename,
            ));
        }

        app(\App\Services\ActivityLogService::class)->log(
            'report',
            null,
            'report.scheduled_sent',
            "Laporan terjadwal ({$this->frequencyLabel()}) dikirim ke {$recipients->count()} administrator",
            ['period' => $label],
        );
    }

    /**
     * @return array{0: Carbon, 1: Carbon, 2: string}
     */
    private function period(): array
    {
        return match ($this->frequency) {
            'daily' => [now()->startOfDay(), now()->endOfDay(), now()->translatedFormat('d F Y')],
            'weekly' => [now()->subWeek()->startOfDay(), now()->endOfDay(), now()->subWeek()->translatedFormat('d M').' – '.now()->translatedFormat('d M Y')],
            default => [now()->startOfMonth(), now()->endOfMonth(), now()->translatedFormat('F Y')],
        };
    }

    private function frequencyLabel(): string
    {
        return match ($this->frequency) {
            'daily' => 'Harian',
            'weekly' => 'Mingguan',
            default => 'Bulanan',
        };
    }
}
