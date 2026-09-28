<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Pengeluaran — operational expenses, primarily fuel claims (Claim Bensin).
 */
class PengeluaranController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Expense::query()
            ->with(['recorder', 'document'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($w) use ($term) {
                    $w->where('expense_code', 'ilike', $term)
                        ->orWhere('vehicle', 'ilike', $term)
                        ->orWhere('station', 'ilike', $term)
                        ->orWhere('proof_reference', 'ilike', $term);
                });
            })
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('expense_date', '>=', $request->input('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('expense_date', '<=', $request->input('date_to')))
            ->latest('expense_date')
            ->latest('id');

        $perPage = min((int) $request->integer('per_page', 20), 100);
        $paginated = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'summary' => [
                'total_amount' => (string) $paginated->getCollection()->sum('amount'),
                'draft' => $paginated->getCollection()->where('status', 'DRAFT')->count(),
                'submitted' => $paginated->getCollection()->where('status', 'SUBMITTED')->count(),
                'approved' => $paginated->getCollection()->where('status', 'APPROVED')->count(),
            ],
            'trends' => $this->monthlyTrend(),
        ]);
    }

    /**
     * Six-month count of expenses, for the KPI sparkline.
     *
     * @return array<int, int>
     */
    private function monthlyTrend(): array
    {
        $from = now()->subMonths(5)->startOfMonth();

        $rows = Expense::query()->where('expense_date', '>=', $from->toDateString())->get(['expense_date']);

        $buckets = [];
        for ($i = 5; $i >= 0; $i--) {
            $buckets[now()->subMonths($i)->format('Y-m')] = 0;
        }
        foreach ($rows as $row) {
            $key = $row->expense_date ? \Illuminate\Support\Carbon::parse($row->expense_date)->format('Y-m') : null;
            if ($key !== null && array_key_exists($key, $buckets)) {
                $buckets[$key]++;
            }
        }

        return array_values($buckets);
    }

    public function show(Expense $expense): JsonResponse
    {
        $expense->load(['recorder', 'document']);

        return response()->json(['data' => $expense]);
    }

    public function store(Request $request): JsonResponse    {
        $validated = $request->validate([
            'category' => ['nullable', 'string', 'in:'.implode(',', ['FUEL', 'TOLL', 'OTHER'])],
            'expense_date' => ['required', 'date'],
            'vehicle' => ['nullable', 'string', 'max:60'],
            'odometer_km' => ['nullable', 'integer', 'min:0'],
            'station' => ['nullable', 'string', 'max:80'],
            'fuel_type' => ['nullable', 'string', 'max:40'],
            'amount' => ['required', 'numeric', 'min:0'],
            'proof_reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
        ]);

        $expense = Expense::create([
            ...$validated,
            'category' => $validated['category'] ?? 'FUEL',
            'expense_code' => $this->nextCode(),
            'status' => 'DRAFT',
            'recorded_by' => $request->user()?->id,
        ]);

        app(\App\Services\ActivityLogService::class)->log(
            'expense',
            $expense->id,
            'expense.created',
            "Pengeluaran dicatat: {$expense->expense_code}",
            ['amount' => (string) $expense->amount],
        );

        app(\App\Services\NotificationService::class)->notifyExpenseSubmitted(
            $expense->expense_code,
            (string) $expense->amount,
        );

        return response()->json(['data' => $expense], 201);
    }

    public function updateStatus(Request $request, Expense $expense): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:DRAFT,SUBMITTED,APPROVED,REJECTED,PAID'],
        ]);

        $expense->forceFill(['status' => $validated['status']])->save();

        app(\App\Services\ActivityLogService::class)->log(
            'expense',
            $expense->id,
            'expense.status_updated',
            "Status pengeluaran {$expense->expense_code} menjadi {$validated['status']}",
        );

        return response()->json(['data' => $expense]);
    }

    private function nextCode(): string
    {
        $prefix = 'EXP-'.Carbon::now()->format('Y').'-';
        $last = Expense::withTrashed()->where('expense_code', 'like', $prefix.'%')->latest('id')->value('expense_code');
        $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
