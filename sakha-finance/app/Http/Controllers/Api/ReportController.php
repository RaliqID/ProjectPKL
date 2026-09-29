<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ScheduledReportMail;
use App\Services\ActivityLogService;
use App\Services\ExcelReportService;
use App\Services\FinanceReportBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

/**
 * Report exports for the Finance modules.
 *
 * The datasets live in FinanceReportBuilder, so this controller only decides
 * HOW to render a report (PDF, CSV, Excel or email) and never how the data is
 * shaped. That keeps one source of truth and stops the formats drifting.
 */
class ReportController extends Controller
{
    public function __construct(
        private readonly FinanceReportBuilder $reports,
        private readonly ExcelReportService $excel,
        private readonly ActivityLogService $activity,
    ) {}

    public function index(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);

        return response()->json([
            'data' => [
                'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
                'summaries' => $this->reports->summaries($from, $to),
            ],
        ]);
    }

    public function exportCsv(Request $request, string $type): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        [$from, $to] = $this->range($request);
        $report = $this->reports->build($type, $from, $to);

        return $this->csv('laporan-'.$type, $report['headers'], $this->csvRows($report));
    }

    public function exportTransactions(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return $this->exportCsv($request, 'transactions');
    }

    public function exportInvoices(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return $this->exportCsv($request, 'invoices');
    }

    public function exportArchives(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return $this->exportCsv($request, 'archives');
    }

    public function exportExpenses(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return $this->exportCsv($request, 'expenses');
    }

    public function exportProcurements(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return $this->exportCsv($request, 'procurements');
    }

    public function exportKetelitian(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return $this->exportCsv($request, 'ketelitian');
    }

    /**
     * Detailed accuracy export: one row per check, so findings can be filtered
     * and analysed criterion by criterion in a spreadsheet.
     */
    public function exportKetelitianDetail(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $service = app(\App\Services\AccuracyService::class);

        $rows = [];
        foreach (\App\Models\Transaction::with(['customer', 'invoices', 'documents', 'latestVerificationRun'])
            ->whereHas('invoices')->orderByDesc('transaction_date')->get() as $transaction) {
            $result = $service->check($transaction);

            foreach ($result['checks'] as $check) {
                $rows[] = [
                    $result['transaction_code'],
                    $result['customer'] ?? '-',
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
        ], collect($rows));
    }

    public function exportExcel(Request $request, string $type): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        [$from, $to] = $this->range($request);
        $report = $this->reports->build($type, $from, $to);

        $spreadsheet = $this->excel->build(
            $report['title'],
            $report['headers'],
            $report['rows'],
            $report['types'],
            $report['summary'],
        );

        return $this->excel->download($spreadsheet, 'laporan-'.$type);
    }

    public function pdfReport(Request $request, string $type): \Illuminate\Http\Response
    {
        [$from, $to] = $this->range($request);
        $report = $this->reports->build($type, $from, $to);

        return $this->pdfFromReport($report);
    }

    public function pdfTransactions(Request $request): \Illuminate\Http\Response
    {
        return $this->pdfReport($request, 'transactions');
    }

    public function pdfInvoices(Request $request): \Illuminate\Http\Response
    {
        return $this->pdfReport($request, 'invoices');
    }

    public function pdfArchives(Request $request): \Illuminate\Http\Response
    {
        return $this->pdfReport($request, 'archives');
    }

    public function pdfExpenses(Request $request): \Illuminate\Http\Response
    {
        return $this->pdfReport($request, 'expenses');
    }

    public function pdfProcurements(Request $request): \Illuminate\Http\Response
    {
        return $this->pdfReport($request, 'procurements');
    }

    public function pdfKetelitian(Request $request): \Illuminate\Http\Response
    {
        return $this->pdfReport($request, 'ketelitian');
    }

    public function emailReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:'.implode(',', FinanceReportBuilder::types())],
            'email' => ['nullable', 'email'],
        ]);

        $to = $validated['email'] ?? $request->user()->email;
        $report = $this->reports->build($validated['type']);

        Mail::to($to)->send(new ScheduledReportMail(
            reportTitle: $report['title'],
            periodLabel: now()->translatedFormat('d F Y, H:i'),
            summary: $report['summary'],
            pdfBytes: $this->pdfBytes($report),
            pdfFilename: 'laporan-'.$validated['type'].'.pdf',
        ));

        $this->activity->log('report', null, 'report.emailed', "Laporan {$report['title']} dikirim ke {$to}");

        return response()->json(['message' => "Laporan dikirim ke {$to}."]);
    }

    /**
     * CSV is a business-friendly format, not a byte mirror of the screen, so
     * dates and money are written as readable strings.
     *
     * @param  array<string,mixed>  $report
     * @return \Illuminate\Support\Collection<int, array<int, mixed>>
     */
    private function csvRows(array $report): \Illuminate\Support\Collection
    {
        return collect($report['rows'])->map(function (array $row) use ($report) {
            return array_map(function ($value, $index) use ($report) {
                $type = $report['types'][$index] ?? 'Text';

                return match ($type) {
                    'Date' => $value instanceof Carbon ? $value->format('d/m/Y') : (string) $value,
                    'Money' => (string) (float) $value,
                    default => $value,
                };
            }, array_values($row), array_keys(array_values($row)));
        });
    }

    /**
     * Stream rows as a CSV download.
     *
     * A UTF-8 BOM is written so Excel on Windows opens Indonesian characters
     * correctly, and the delimiter is a semicolon because Excel in the id-ID
     * locale treats the comma as a decimal separator.
     *
     * @param  array<int, string>  $headers
     * @param  iterable<int, array<int, scalar|null>>  $rows
     */
    private function csv(string $filename, array $headers, iterable $rows): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $callback = function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
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

    /** @param array<string,mixed> $report */
    private function pdfFromReport(array $report): \Illuminate\Http\Response
    {
        return Pdf::loadView('reports.table', [
            'title' => $report['title'],
            'subtitle' => 'Laporan '.$report['title'].' dari sistem.',
            'headers' => $report['headers'],
            'rows' => $this->pdfRows($report),
            'summary' => $report['summary'],
            'period' => $report['period'],
            'numericColumns' => $this->numericColumns($report['types']),
            'trend' => $report['trend'],
            'logo' => $this->logoDataUri(),
            'generated_at' => now()->translatedFormat('d F Y, H:i'),
            'generated_by' => request()->user()?->name,
        ])->setPaper('a4', $report['landscape'] ? 'landscape' : 'portrait')
            ->download('laporan-'.$this->slug($report['title']).'.pdf');
    }

    /** @param array<string,mixed> $report */
    private function pdfBytes(array $report): string
    {
        return $this->pdfFromReport($report)->getContent();
    }

    /**
     * The PDF template renders money as a formatted string, so money cells are
     * pre-formatted here rather than sent as raw numbers.
     *
     * @param  array<string,mixed>  $report
     * @return array<int, array<int, string>>
     */
    private function pdfRows(array $report): array
    {
        return array_map(function (array $row) use ($report) {
            $values = array_values($row);

            return array_map(function ($value, $index) use ($report) {
                $type = $report['types'][$index] ?? 'Text';

                return match ($type) {
                    'Money' => 'Rp '.number_format((float) $value, 0, ',', '.'),
                    'Date' => $value instanceof Carbon ? $value->format('d/m/Y') : (string) $value,
                    default => (string) $value,
                };
            }, $values, array_keys($values));
        }, $report['rows']);
    }

    /**
     * @param  array<int, string>  $types
     * @return array<int, int>
     */
    private function numericColumns(array $types): array
    {
        return array_keys(array_filter($types, fn ($t) => in_array($t, ['Money', 'Int'], true)));
    }

    private function logoDataUri(): ?string
    {
        $path = public_path('sakha-logo.png');
        if (! is_file($path)) {
            return null;
        }

        return 'data:image/png;base64,'.base64_encode(file_get_contents($path));
    }

    private function slug(string $title): string
    {
        return strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $title));
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function range(Request $request): array
    {
        $from = $request->filled('date_from')
            ? Carbon::parse($request->input('date_from'))
            : now()->startOfMonth();
        $to = $request->filled('date_to')
            ? Carbon::parse($request->input('date_to'))
            : now();

        return [$from, $to];
    }
}
