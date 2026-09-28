<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\Transaction;
use App\Services\PaymentMatchService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $service,
        private readonly PaymentMatchService $matching,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Payment::query()->with('transaction.customer');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($method = $request->string('method')->toString()) {
            $query->where('method', $method);
        }

        if ($from = $request->string('date_from')->toString()) {
            $query->whereDate('payment_date', '>=', $from);
        }

        if ($to = $request->string('date_to')->toString()) {
            $query->whereDate('payment_date', '<=', $to);
        }

        if ($term = $request->string('q')->toString()) {
            $like = '%'.$term.'%';
            $query->where(function ($q) use ($like) {
                $q->where('payment_reference', 'ilike', $like)
                    ->orWhereHas('transaction', fn ($t) => $t->where('transaction_code', 'ilike', $like));
            });
        }

        $perPage = min((int) $request->integer('per_page', 15), 100);
        $paginated = $query->orderByDesc('payment_date')->orderByDesc('id')->paginate($perPage)->withQueryString();

        return PaymentResource::collection($paginated)->response();
    }

    public function store(StorePaymentRequest $request, Transaction $transaction): JsonResponse
    {
        $payment = $this->service->record($transaction, $request->user(), $request->validated());

        return response()->json(['data' => new PaymentResource($payment)], 201);
    }

    public function confirm(Request $request, Payment $payment): JsonResponse
    {
        if (! $request->user()->canWrite()) {
            abort(403, 'Anda tidak berwenang mengonfirmasi pembayaran.');
        }

        $confirmed = $this->service->confirm($payment, $request->user());

        return response()->json(['data' => new PaymentResource($confirmed)]);
    }

    public function reject(Request $request, Payment $payment): JsonResponse
    {
        if (! $request->user()->canWrite()) {
            abort(403, 'Anda tidak berwenang menolak pembayaran.');
        }

        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);
        $rejected = $this->service->reject($payment, $request->user(), $validated['reason'] ?? null);

        return response()->json(['data' => new PaymentResource($rejected)]);
    }

    /**
     * Pencocokan Pembayaran — invoice vs payment comparison across transactions.
     */
    public function matching(Request $request): JsonResponse
    {
        $query = Transaction::query()
            ->with(['customer', 'invoices', 'payments'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($w) use ($term) {
                    $w->where('transaction_code', 'ilike', $term)
                        ->orWhereHas('customer', fn ($c) => $c->where('name', 'ilike', $term));
                });
            })
            ->whereHas('invoices')
            ->latest('transaction_date');

        $perPage = min((int) $request->integer('per_page', 15), 100);
        $paginated = $query->paginate($perPage)->withQueryString();

        $rows = collect($paginated->items())->map(fn (Transaction $t) => $this->matching->match($t));

        // Optional filter on the computed match result.
        if ($request->filled('result')) {
            $want = strtoupper((string) $request->input('result'));
            $rows = $rows->filter(fn ($r) => $r['status'] === $want)->values();
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
}
