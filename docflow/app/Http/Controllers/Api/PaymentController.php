<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\Transaction;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $service) {}

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
            abort(403, 'You are not allowed to confirm payments.');
        }

        $confirmed = $this->service->confirm($payment, $request->user());

        return response()->json(['data' => new PaymentResource($confirmed)]);
    }

    public function reject(Request $request, Payment $payment): JsonResponse
    {
        if (! $request->user()->canWrite()) {
            abort(403, 'You are not allowed to reject payments.');
        }

        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);
        $rejected = $this->service->reject($payment, $request->user(), $validated['reason'] ?? null);

        return response()->json(['data' => new PaymentResource($rejected)]);
    }
}
