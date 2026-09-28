<?php

namespace App\Http\Controllers\Api;

use App\Enums\DeliveryStatus;
use App\Enums\DocumentStatus;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\Delivery;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Transaction;
use App\Services\AttentionService;
use Illuminate\Http\JsonResponse;

class OverviewController extends Controller
{
    public function __construct(private readonly AttentionService $attention) {}

    public function index(): JsonResponse
    {
        $now = now();
        $monthStart = $now->copy()->startOfMonth();

        // --- Metric cards (real queries, no hardcoded numbers) ---
        $metrics = [
            'total_transactions' => Transaction::count(),
            'transactions_this_month' => Transaction::where('transaction_date', '>=', $monthStart)->count(),
            'completed_transactions' => Transaction::where('status', TransactionStatus::COMPLETED)->count(),
            'needs_review' => Transaction::where('status', TransactionStatus::NEEDS_REVIEW)->count(),
            'active_deliveries' => Delivery::whereIn('status', [
                DeliveryStatus::PREPARING, DeliveryStatus::SHIPPED, DeliveryStatus::IN_TRANSIT,
            ])->count(),
            'pending_documents' => Document::whereIn('status', [
                DocumentStatus::UPLOADED, DocumentStatus::UNDER_REVIEW,
            ])->count(),
            'verification_failures' => Transaction::whereHas('latestVerificationRun', fn ($q) => $q->where('failed_count', '>', 0))->count(),

            // --- Finance-focused counters for Beranda ---
            'invoices_total' => Invoice::count(),
            'invoices_unpaid' => Invoice::whereIn('status', [
                InvoiceStatus::ISSUED, InvoiceStatus::PARTIALLY_PAID, InvoiceStatus::OVERDUE,
            ])->count(),
            'payments_this_month' => Payment::where('payment_date', '>=', $monthStart)->count(),
            'payments_pending' => Payment::where('status', PaymentStatus::PENDING)->count(),
            'documents_archived' => Document::where('status', DocumentStatus::ARCHIVED)->count(),
            'documents_total' => Document::count(),

            // --- Pengiriman / resi (Finance view) ---
            'deliveries_total' => Delivery::count(),
            'deliveries_missing_receipt' => Delivery::whereNull('receipt_number')->whereNull('tracking_number')->count(),
            'deliveries_missing_handover' => Delivery::whereNull('handover_number')->count(),
            'deliveries_delivered_unfiled' => Delivery::where('status', DeliveryStatus::DELIVERED)
                ->whereNull('handover_date')->count(),
        ];

        // Outstanding payment: sum(total) - sum(confirmed payments) over active transactions.
        $metrics['outstanding_payment_amount'] = $this->outstandingAmount();

        // Overdue invoices.
        $overdue = Invoice::query()
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $now->toDateString())
            ->whereNotIn('status', ['PAID', 'CANCELLED'])
            ->get();
        $metrics['overdue_invoices'] = $overdue->count();
        $metrics['overdue_invoices_amount'] = $overdue->reduce(
            fn ($carry, $invoice) => bcadd($carry, $invoice->remainingAmount(), 2),
            '0.00',
        );

        // Delayed deliveries.
        $metrics['delayed_deliveries'] = Delivery::query()
            ->where('status', '!=', DeliveryStatus::DELIVERED)
            ->whereNotNull('estimated_delivery_date')
            ->whereDate('estimated_delivery_date', '<', $now->toDateString())
            ->count();

        $attention = $this->attention->build(20);

        $recentActivity = ActivityLog::with('user')->latest()->limit(12)->get();

        $statusBreakdown = Transaction::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $documentStatusBreakdown = Document::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'data' => [
                'metrics' => $metrics,
                'trends' => $this->trends(),
                'attention' => $attention,
                'recent_activity' => ActivityLogResource::collection($recentActivity),
                'status_breakdown' => $statusBreakdown,
                'document_status_breakdown' => $documentStatusBreakdown,
            ],
        ]);
    }

    /**
     * Six-month mini series for the Beranda KPI sparklines.
     *
     * @return array<string, array<int, int>>
     */
    private function trends(): array
    {
        $from = now()->subMonths(5)->startOfMonth();

        // bucket key (Y-m) => count, for a given model by date column.
        $monthly = function (string $model, string $dateColumn, ?callable $constrain = null) use ($from): array {
            $query = $model::query()->where($dateColumn, '>=', $from->toDateString());
            if ($constrain) {
                $constrain($query);
            }

            $rows = $query->get([$dateColumn]);

            $buckets = [];
            for ($i = 5; $i >= 0; $i--) {
                $buckets[now()->subMonths($i)->format('Y-m')] = 0;
            }

            foreach ($rows as $row) {
                $value = $row->{$dateColumn};
                $key = $value ? \Illuminate\Support\Carbon::parse($value)->format('Y-m') : null;
                if ($key !== null && array_key_exists($key, $buckets)) {
                    $buckets[$key]++;
                }
            }

            return array_values($buckets);
        };

        return [
            'transactions' => $monthly(Transaction::class, 'transaction_date'),
            'invoices' => $monthly(Invoice::class, 'invoice_date'),
            'payments' => $monthly(Payment::class, 'payment_date'),
            'documents' => $monthly(Document::class, 'created_at'),
            'expenses' => $monthly(\App\Models\Expense::class, 'expense_date'),
            'procurements' => $monthly(\App\Models\Procurement::class, 'request_date'),
        ];
    }

    private function outstandingAmount(): string
    {
        $total = Transaction::query()
            ->whereNotIn('status', [TransactionStatus::CANCELLED])
            ->sum('total_amount');

        $paid = \App\Models\Payment::query()
            ->where('status', \App\Enums\PaymentStatus::CONFIRMED)
            ->whereHas('transaction', fn ($q) => $q->whereNotIn('status', [TransactionStatus::CANCELLED]))
            ->sum('amount');

        $outstanding = bcsub(number_format((float) $total, 2, '.', ''), number_format((float) $paid, 2, '.', ''), 2);

        return bccomp($outstanding, '0', 2) < 0 ? '0.00' : $outstanding;
    }
}
