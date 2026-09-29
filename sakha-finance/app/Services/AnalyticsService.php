<?php

namespace App\Services;

use App\Enums\DeliveryStatus;
use App\Enums\DocumentStatus;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\Archive;
use App\Models\Delivery;
use App\Models\Document;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Procurement;
use App\Models\Transaction;
use App\Models\VerificationRun;
use Carbon\CarbonImmutable;

/**
 * Builds the month-by-month time series that back the analytics charts.
 *
 * Everything here is derived from stored records — no estimates, no inferred
 * values — so a chart can be traced back to the rows that produced it. The
 * service is intentionally read-only and month-bucketed: an operational
 * dashboard needs "is this getting better or worse", which means a stable
 * x-axis rather than an ad-hoc range.
 *
 * Kept as one file on purpose: all fourteen series share the same shape
 * (buckets in, aligned arrays out) and are read together when the dashboard
 * changes. Splitting them would scatter one concept.
 * aislop-ignore-next-line complexity/file-too-large -- one cohesive concept; every series shares the bucket contract
 */
class AnalyticsService
{
    public const DEFAULT_MONTHS = 6;

    /**
     * @return array<string, mixed>
     */
    public function build(int $months = self::DEFAULT_MONTHS): array
    {
        $months = max(1, min($months, 24));

        // Inclusive window covering whole calendar months, ending this month.
        $end = CarbonImmutable::now()->endOfMonth();
        $start = CarbonImmutable::now()->subMonths($months - 1)->startOfMonth();

        $buckets = $this->monthBuckets($start, $end);

        return [
            'range' => [
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
                'months' => $months,
            ],
            'months' => array_keys($buckets),
            'transactions' => $this->transactionSeries($start, $end, $buckets),
            'revenue' => $this->revenueSeries($start, $end, $buckets),
            'verification' => $this->verificationSeries($start, $end, $buckets),
            'deliveries' => $this->deliverySeries($start, $end, $buckets),
            'documents' => $this->documentSeries($start, $end, $buckets),
            'invoices' => $this->invoiceSeries($start, $end, $buckets),
            'payments' => $this->paymentSeries($start, $end, $buckets),
            'matching' => $this->matchingSnapshot(),
            'archives' => $this->archiveSeries($start, $end, $buckets),
            'accuracy' => $this->accuracySnapshot(),
            'expenses' => $this->expenseSeries($start, $end, $buckets),
            'procurements' => $this->procurementSeries($start, $end, $buckets),
            'status_breakdown' => $this->statusBreakdown(),
        ];
    }

    /**
     * Ordered ['2026-05' => 0, '2026-06' => 0, ...] map used as the chart x-axis.
     *
     * @return array<string, int>
     */
    private function monthBuckets(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $buckets = [];
        $cursor = $start->startOfMonth();

        while ($cursor->lessThanOrEqualTo($end)) {
            $buckets[$cursor->format('Y-m')] = 0;
            $cursor = $cursor->addMonth();
        }

        return $buckets;
    }

    /**
     * @param  array<string, int>  $buckets
     * @return array<string, mixed>
     */
    private function transactionSeries(CarbonImmutable $start, CarbonImmutable $end, array $buckets): array
    {
        $rows = Transaction::query()
            ->whereBetween('transaction_date', [$start->toDateString(), $end->toDateString()])
            ->get(['transaction_date', 'status', 'total_amount']);

        $counts = $buckets;
        $completed = $buckets;
        $needsReview = $buckets;

        foreach ($rows as $row) {
            $key = $row->transaction_date?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $counts)) {
                continue;
            }
            $counts[$key]++;
            if ($row->status === TransactionStatus::COMPLETED) {
                $completed[$key]++;
            }
            if ($row->status === TransactionStatus::NEEDS_REVIEW) {
                $needsReview[$key]++;
            }
        }

        return [
            'total' => array_values($counts),
            'completed' => array_values($completed),
            'needs_review' => array_values($needsReview),
            'grand_total' => $rows->count(),
            'grand_completed' => $rows->where('status', TransactionStatus::COMPLETED)->count(),
        ];
    }

    /**
     * Confirmed payment value per month, plus the transaction value it settles.
     *
     * @param  array<string, int>  $buckets
     * @return array<string, mixed>
     */
    private function revenueSeries(CarbonImmutable $start, CarbonImmutable $end, array $buckets): array
    {
        $payments = Payment::query()
            ->whereBetween('payment_date', [$start->toDateString(), $end->toDateString()])
            ->get(['payment_date', 'amount', 'status']);

        $invoiced = Invoice::query()
            ->whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])
            ->get(['invoice_date', 'amount', 'tax_amount']);

        $paid = array_map(fn () => 0.0, $buckets);
        $issued = array_map(fn () => 0.0, $buckets);

        foreach ($payments as $payment) {
            if ($payment->status !== PaymentStatus::CONFIRMED) {
                continue;
            }
            $key = $payment->payment_date?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $paid)) {
                continue;
            }
            $paid[$key] += (float) $payment->amount;
        }

        foreach ($invoiced as $invoice) {
            $key = $invoice->invoice_date?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $issued)) {
                continue;
            }
            $issued[$key] += (float) $invoice->amount + (float) $invoice->tax_amount;
        }

        return [
            'paid' => array_values(array_map(fn ($v) => round($v, 2), $paid)),
            'invoiced' => array_values(array_map(fn ($v) => round($v, 2), $issued)),
            'total_paid' => round(array_sum($paid), 2),
            'total_invoiced' => round(array_sum($issued), 2),
        ];
    }

    /**
     * Verification pass / warning / failed counts and average score per month.
     *
     * @param  array<string, int>  $buckets
     * @return array<string, mixed>
     */
    private function verificationSeries(CarbonImmutable $start, CarbonImmutable $end, array $buckets): array
    {
        $runs = VerificationRun::query()
            ->whereBetween('created_at', [$start, $end])
            ->get(['created_at', 'overall_status', 'score']);

        $passed = $buckets;
        $warning = $buckets;
        $failed = $buckets;
        $scoreSum = array_map(fn () => 0.0, $buckets);
        $scoreCount = $buckets;

        foreach ($runs as $run) {
            $key = $run->created_at?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $passed)) {
                continue;
            }
            match ($run->overall_status) {
                'PASS' => $passed[$key]++,
                'WARNING' => $warning[$key]++,
                default => $failed[$key]++,
            };
            $scoreSum[$key] += (float) $run->score;
            $scoreCount[$key]++;
        }

        $avgScore = [];
        foreach (array_keys($buckets) as $key) {
            $avgScore[$key] = $scoreCount[$key] > 0 ? (int) round($scoreSum[$key] / $scoreCount[$key]) : 0;
        }

        return [
            'passed' => array_values($passed),
            'warning' => array_values($warning),
            'failed' => array_values($failed),
            'average_score' => array_values($avgScore),
            'total_runs' => $runs->count(),
            'overall_pass_rate' => $runs->count()
                ? (int) round($runs->where('overall_status', 'PASS')->count() / $runs->count() * 100)
                : 0,
        ];
    }

    /**
     * Deliveries completed vs still in motion vs delayed per month.
     *
     * @param  array<string, int>  $buckets
     * @return array<string, mixed>
     */
    private function deliverySeries(CarbonImmutable $start, CarbonImmutable $end, array $buckets): array
    {
        $deliveries = Delivery::query()
            ->whereBetween('shipping_date', [$start->toDateString(), $end->toDateString()])
            ->get(['shipping_date', 'estimated_delivery_date', 'delivered_at', 'status']);

        $completed = $buckets;
        $inTransit = $buckets;
        $delayed = $buckets;

        foreach ($deliveries as $delivery) {
            $key = $delivery->shipping_date?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $completed)) {
                continue;
            }

            if ($delivery->status === DeliveryStatus::DELIVERED) {
                $completed[$key]++;
            } elseif (in_array($delivery->status, [DeliveryStatus::SHIPPED, DeliveryStatus::IN_TRANSIT, DeliveryStatus::PREPARING], true)) {
                $inTransit[$key]++;
            }

            if ($delivery->isDelayed()) {
                $delayed[$key]++;
            }
        }

        return [
            'completed' => array_values($completed),
            'in_transit' => array_values($inTransit),
            'delayed' => array_values($delayed),
            'total' => $deliveries->count(),
            'on_time_rate' => $deliveries->count()
                ? (int) round(($deliveries->count() - $deliveries->filter(fn (Delivery $d) => $d->isDelayed())->count()) / $deliveries->count() * 100)
                : 100,
        ];
    }

    /**
     * Documents uploaded vs verified per month (workload vs throughput).
     *
     * @param  array<string, int>  $buckets
     * @return array<string, mixed>
     */
    private function documentSeries(CarbonImmutable $start, CarbonImmutable $end, array $buckets): array
    {
        $documents = Document::query()
            ->whereBetween('created_at', [$start, $end])
            ->get(['created_at', 'status']);

        $uploaded = $buckets;
        $verified = $buckets;

        foreach ($documents as $document) {
            $key = $document->created_at?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $uploaded)) {
                continue;
            }
            $uploaded[$key]++;
            if ($document->status === DocumentStatus::VERIFIED) {
                $verified[$key]++;
            }
        }

        return [
            'uploaded' => array_values($uploaded),
            'verified' => array_values($verified),
            'total' => $documents->count(),
        ];
    }

    /**
     * Current transaction status distribution (a snapshot, not a series).
     *
     * @return array<string, int>
     */
    private function statusBreakdown(): array
    {
        return Transaction::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();
    }

    /**
     * Invoices issued / paid / overdue per month, plus their value.
     *
     * @param  array<string, int>  $buckets
     * @return array<string, mixed>
     */
    private function invoiceSeries(CarbonImmutable $start, CarbonImmutable $end, array $buckets): array
    {
        $invoices = Invoice::query()
            ->whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])
            ->get(['invoice_date', 'amount', 'tax_amount', 'status', 'due_date']);

        $issued = $buckets;
        $paid = $buckets;
        $overdue = $buckets;
        $value = array_map(fn () => 0.0, $buckets);

        foreach ($invoices as $invoice) {
            $key = $invoice->invoice_date?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $issued)) {
                continue;
            }
            $issued[$key]++;
            $value[$key] += (float) $invoice->amount + (float) $invoice->tax_amount;

            if ($invoice->status === InvoiceStatus::PAID) {
                $paid[$key]++;
            }
            if ($invoice->isOverdue()) {
                $overdue[$key]++;
            }
        }

        return [
            'issued' => array_values($issued),
            'paid' => array_values($paid),
            'overdue' => array_values($overdue),
            'value' => array_values(array_map(fn ($v) => round($v, 2), $value)),
            'total' => $invoices->count(),
            'total_value' => round(array_sum($value), 2),
            'overdue_current' => Invoice::query()->get()->filter(fn (Invoice $i) => $i->isOverdue())->count(),
        ];
    }

    /**
     * Payments recorded and confirmed per month, by count and value.
     *
     * @param  array<string, int>  $buckets
     * @return array<string, mixed>
     */
    private function paymentSeries(CarbonImmutable $start, CarbonImmutable $end, array $buckets): array
    {
        $payments = Payment::query()
            ->whereBetween('payment_date', [$start->toDateString(), $end->toDateString()])
            ->get(['payment_date', 'amount', 'status']);

        $recorded = $buckets;
        $confirmed = $buckets;
        $pending = $buckets;
        $value = array_map(fn () => 0.0, $buckets);

        foreach ($payments as $payment) {
            $key = $payment->payment_date?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $recorded)) {
                continue;
            }
            $recorded[$key]++;

            match ($payment->status) {
                PaymentStatus::CONFIRMED => $confirmed[$key]++,
                PaymentStatus::PENDING => $pending[$key]++,
                default => null,
            };

            if ($payment->status === PaymentStatus::CONFIRMED) {
                $value[$key] += (float) $payment->amount;
            }
        }

        return [
            'recorded' => array_values($recorded),
            'confirmed' => array_values($confirmed),
            'pending' => array_values($pending),
            'value' => array_values(array_map(fn ($v) => round($v, 2), $value)),
            'total' => $payments->count(),
            'total_confirmed' => round(array_sum($value), 2),
        ];
    }

    /**
     * Current payment-matching snapshot: how many transactions are matched,
     * need checking, or are unmatched. Computed on demand from live data.
     *
     * @return array<string, mixed>
     */
    private function matchingSnapshot(): array
    {
        $service = app(PaymentMatchService::class);

        $transactions = Transaction::query()
            ->with(['invoices', 'payments'])
            ->whereHas('invoices')
            ->get();

        $counts = ['SESUAI' => 0, 'PERLU_DIPERIKSA' => 0, 'TIDAK_SESUAI' => 0];
        $differenceTotal = 0.0;

        foreach ($transactions as $transaction) {
            $result = $service->match($transaction);
            $counts[$result['status']] = ($counts[$result['status']] ?? 0) + 1;
            $differenceTotal += abs((float) $result['difference']);
        }

        $total = array_sum($counts);
        $matchRate = $total > 0 ? (int) round($counts['SESUAI'] / $total * 100) : 0;

        return [
            'sesuai' => $counts['SESUAI'],
            'perlu_diperiksa' => $counts['PERLU_DIPERIKSA'],
            'tidak_sesuai' => $counts['TIDAK_SESUAI'],
            'total' => $total,
            'match_rate' => $matchRate,
            'difference_total' => round($differenceTotal, 2),
        ];
    }

    /**
     * Archive volume per month (documents filed) split by whether the file is
     * in the archive yet.
     *
     * @param  array<string, int>  $buckets
     * @return array<string, mixed>
     */
    private function archiveSeries(CarbonImmutable $start, CarbonImmutable $end, array $buckets): array
    {
        $archives = Archive::query()
            ->whereBetween('document_date', [$start->toDateString(), $end->toDateString()])
            ->get(['document_date', 'document_type']);

        $filed = $buckets;
        $byType = [];

        foreach ($archives as $archive) {
            $key = $archive->document_date?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $filed)) {
                continue;
            }
            $filed[$key]++;

            $type = $archive->document_type;
            $typeValue = $type instanceof \App\Enums\DocumentType ? $type->value : (string) $type;
            $label = $type instanceof \App\Enums\DocumentType ? $type->label() : $typeValue;
            $byType[$typeValue] ??= ['value' => $typeValue, 'label' => $label, 'total' => 0];
            $byType[$typeValue]['total']++;
        }

        usort($byType, fn ($a, $b) => $b['total'] <=> $a['total']);

        return [
            'filed' => array_values($filed),
            'total' => $archives->count(),
            'by_type' => array_values($byType),
        ];
    }

    /**
     * Current accuracy-checking snapshot across all transactions.
     *
     * @return array<string, mixed>
     */
    private function accuracySnapshot(): array
    {
        $service = app(AccuracyService::class);

        $transactions = Transaction::query()
            ->with(['customer', 'invoices', 'documents', 'latestVerificationRun'])
            ->whereHas('invoices')
            ->get();

        $counts = ['SESUAI' => 0, 'PERLU_DIPERIKSA' => 0, 'TIDAK_SESUAI' => 0];
        $checkTotals = ['sesuai' => 0, 'perlu_diperiksa' => 0, 'tidak_sesuai' => 0];

        foreach ($transactions as $transaction) {
            $result = $service->check($transaction);
            $counts[$result['overall']] = ($counts[$result['overall']] ?? 0) + 1;
            $checkTotals['sesuai'] += $result['sesuai'];
            $checkTotals['perlu_diperiksa'] += $result['perlu_diperiksa'];
            $checkTotals['tidak_sesuai'] += $result['tidak_sesuai'];
        }

        $total = array_sum($counts);
        $accuracyRate = $total > 0 ? (int) round($counts['SESUAI'] / $total * 100) : 0;

        return [
            'sesuai' => $counts['SESUAI'],
            'perlu_diperiksa' => $counts['PERLU_DIPERIKSA'],
            'tidak_sesuai' => $counts['TIDAK_SESUAI'],
            'total' => $total,
            'accuracy_rate' => $accuracyRate,
            'check_totals' => $checkTotals,
        ];
    }

    /**
     * Operating expenses (claim bensin etc.) per month by count and value,
     * split by category.
     *
     * @param  array<string, int>  $buckets
     * @return array<string, mixed>
     */
    private function expenseSeries(CarbonImmutable $start, CarbonImmutable $end, array $buckets): array
    {
        $expenses = Expense::query()
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->get(['expense_date', 'amount', 'category', 'status']);

        $count = $buckets;
        $fuel = array_map(fn () => 0.0, $buckets);
        $others = array_map(fn () => 0.0, $buckets);
        $approved = 0;

        foreach ($expenses as $expense) {
            $key = $expense->expense_date?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $count)) {
                continue;
            }
            $count[$key]++;
            if ($expense->category === 'FUEL') {
                $fuel[$key] += (float) $expense->amount;
            } else {
                $others[$key] += (float) $expense->amount;
            }
            if (in_array($expense->status, ['APPROVED', 'PAID'], true)) {
                $approved++;
            }
        }

        return [
            'count' => array_values($count),
            'fuel_amount' => array_values(array_map(fn ($v) => round($v, 2), $fuel)),
            'other_amount' => array_values(array_map(fn ($v) => round($v, 2), $others)),
            'total' => $expenses->count(),
            'total_amount' => round(array_sum($fuel) + array_sum($others), 2),
            'approved' => $approved,
        ];
    }

    /**
     * Procurement records per month by count and value, with a status snapshot.
     *
     * @param  array<string, int>  $buckets
     * @return array<string, mixed>
     */
    private function procurementSeries(CarbonImmutable $start, CarbonImmutable $end, array $buckets): array
    {
        $rows = Procurement::query()
            ->whereBetween('request_date', [$start->toDateString(), $end->toDateString()])
            ->get(['request_date', 'total_amount', 'status']);

        $count = $buckets;
        $value = array_map(fn () => 0.0, $buckets);
        $byStatus = [];

        foreach ($rows as $row) {
            $key = $row->request_date?->format('Y-m');
            if ($key === null || ! array_key_exists($key, $count)) {
                continue;
            }
            $count[$key]++;
            $value[$key] += (float) $row->total_amount;

            $byStatus[$row->status] = ($byStatus[$row->status] ?? 0) + 1;
        }

        return [
            'count' => array_values($count),
            'value' => array_values(array_map(fn ($v) => round($v, 2), $value)),
            'total' => $rows->count(),
            'total_value' => round(array_sum($value), 2),
            'by_status' => $byStatus,
        ];
    }
}
