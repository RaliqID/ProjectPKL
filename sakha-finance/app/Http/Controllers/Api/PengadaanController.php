<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Procurement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Pengadaan — lightweight procurement record and SPB register.
 *
 * Covers "Update Pengadaan Barang" and "Buku SPB". Not a procurement ERP:
 * one line item per record, with supplier, quantity, resi and status.
 */
class PengadaanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Procurement::query()
            ->with(['creator', 'document'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($w) use ($term) {
                    $w->where('procurement_code', 'ilike', $term)
                        ->orWhere('spb_number', 'ilike', $term)
                        ->orWhere('item_name', 'ilike', $term)
                        ->orWhere('supplier', 'ilike', $term)
                        ->orWhere('tracking_number', 'ilike', $term);
                });
            })
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('request_date', '>=', $request->input('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('request_date', '<=', $request->input('date_to')))
            ->latest('request_date')
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
                'total_amount' => (string) $paginated->getCollection()->sum('total_amount'),
                'requested' => $paginated->getCollection()->where('status', 'REQUESTED')->count(),
                'shipped' => $paginated->getCollection()->where('status', 'SHIPPED')->count(),
                'received' => $paginated->getCollection()->where('status', 'RECEIVED')->count(),
            ],
            'trends' => $this->monthlyTrend(),
        ]);
    }

    /**
     * Six-month count of procurement records, for the KPI sparkline.
     *
     * @return array<int, int>
     */
    private function monthlyTrend(): array
    {
        $from = now()->subMonths(5)->startOfMonth();

        $rows = Procurement::query()->where('request_date', '>=', $from->toDateString())->get(['request_date']);

        $buckets = [];
        for ($i = 5; $i >= 0; $i--) {
            $buckets[now()->subMonths($i)->format('Y-m')] = 0;
        }
        foreach ($rows as $row) {
            $key = $row->request_date ? \Illuminate\Support\Carbon::parse($row->request_date)->format('Y-m') : null;
            if ($key !== null && array_key_exists($key, $buckets)) {
                $buckets[$key]++;
            }
        }

        return array_values($buckets);
    }

    public function show(Procurement $procurement): JsonResponse
    {
        $procurement->load(['creator', 'document']);

        return response()->json(['data' => $procurement]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'spb_number' => ['nullable', 'string', 'max:60'],
            'request_date' => ['required', 'date'],
            'item_name' => ['required', 'string', 'max:255'],
            'supplier' => ['nullable', 'string', 'max:120'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit' => ['nullable', 'string', 'max:30'],
            'division' => ['nullable', 'string', 'max:80'],
            'purpose' => ['nullable', 'string', 'max:160'],
            'tracking_number' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string'],
        ]);

        $procurement = Procurement::create([
            ...$validated,
            'procurement_code' => $this->nextCode(),
            'total_amount' => (string) ((float) $validated['unit_price'] * (int) $validated['quantity']),
            'status' => 'REQUESTED',
            'created_by' => $request->user()?->id,
        ]);

        app(\App\Services\ActivityLogService::class)->log(
            'procurement',
            $procurement->id,
            'procurement.created',
            "Pengadaan dicatat: {$procurement->procurement_code} — {$procurement->item_name}",
        );

        app(\App\Services\NotificationService::class)->notifyProcurementCreated(
            $procurement->procurement_code,
            $procurement->item_name,
        );

        return response()->json(['data' => $procurement], 201);
    }

    public function updateStatus(Request $request, Procurement $procurement): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:REQUESTED,ORDERED,SHIPPED,RECEIVED,CANCELLED'],
            'tracking_number' => ['nullable', 'string', 'max:80'],
        ]);

        $procurement->forceFill([
            'status' => $validated['status'],
            'tracking_number' => $validated['tracking_number'] ?? $procurement->tracking_number,
        ])->save();

        app(\App\Services\ActivityLogService::class)->log(
            'procurement',
            $procurement->id,
            'procurement.status_updated',
            "Status pengadaan {$procurement->procurement_code} menjadi {$validated['status']}",
        );

        return response()->json(['data' => $procurement]);
    }

    private function nextCode(): string
    {
        $prefix = 'PRC-'.Carbon::now()->format('Y').'-';
        $last = Procurement::withTrashed()->where('procurement_code', 'like', $prefix.'%')->latest('id')->value('procurement_code');
        $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
