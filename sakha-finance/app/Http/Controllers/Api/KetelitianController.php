<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\AccuracyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pemeriksaan Ketelitian — accuracy checking of recorded transactions.
 *
 * Lists transactions together with a computed accuracy result, and exposes a
 * detailed per-check breakdown for a single transaction. All results come from
 * AccuracyService; nothing is stored, so a re-check always reflects current data.
 */
class KetelitianController extends Controller
{
    public function __construct(private readonly AccuracyService $accuracy) {}

    public function index(Request $request): JsonResponse
    {
        $query = Transaction::query()
            ->with(['customer', 'invoices', 'documents', 'latestVerificationRun'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($w) use ($term) {
                    $w->where('transaction_code', 'ilike', $term)
                        ->orWhereHas('customer', fn ($c) => $c->where('name', 'ilike', $term));
                });
            })
            ->latest('transaction_date');

        $perPage = min((int) $request->integer('per_page', 15), 100);
        $paginated = $query->paginate($perPage)->withQueryString();

        $rows = collect($paginated->items())->map(fn (Transaction $t) => $this->accuracy->check($t));

        // Optional server-side filter on the computed overall result.
        if ($request->filled('result')) {
            $want = strtoupper((string) $request->input('result'));
            $rows = $rows->filter(fn ($r) => $r['overall'] === $want)->values();
        }

        return response()->json([
            'data' => $rows,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function show(Transaction $transaction): JsonResponse
    {
        return response()->json(['data' => $this->accuracy->check($transaction)]);
    }
}
