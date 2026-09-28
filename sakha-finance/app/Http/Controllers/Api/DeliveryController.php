<?php

namespace App\Http\Controllers\Api;

use App\Enums\DeliveryStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ChangeDeliveryStatusRequest;
use App\Http\Requests\StoreDeliveryRequest;
use App\Http\Resources\DeliveryResource;
use App\Models\Delivery;
use App\Models\Transaction;
use App\Services\DeliveryService;
use App\Services\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryController extends Controller
{
    public function __construct(
        private readonly DeliveryService $service,
        private readonly WorkflowService $workflow,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Delivery::query()->with('transaction.customer');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($courier = $request->string('courier')->toString()) {
            $query->where('courier', 'ilike', '%'.$courier.'%');
        }

        if ($from = $request->string('date_from')->toString()) {
            $query->whereDate('shipping_date', '>=', $from);
        }

        if ($to = $request->string('date_to')->toString()) {
            $query->whereDate('shipping_date', '<=', $to);
        }

        if ($term = $request->string('q')->toString()) {
            $like = '%'.$term.'%';
            $query->where(function ($q) use ($like) {
                $q->where('tracking_number', 'ilike', $like)
                    ->orWhere('delivery_number', 'ilike', $like)
                    ->orWhereHas('transaction', fn ($t) => $t->where('transaction_code', 'ilike', $like));
            });
        }

        $perPage = min((int) $request->integer('per_page', 15), 100);
        $paginated = $query->orderByDesc('id')->paginate($perPage)->withQueryString();

        return DeliveryResource::collection($paginated)->response();
    }

    public function store(StoreDeliveryRequest $request, Transaction $transaction): JsonResponse
    {
        $gate = $this->workflow->canStartDelivery($transaction);

        if (! $gate['allowed'] && ! $request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Pengiriman tidak dapat dimulai untuk transaksi ini.',
                'reasons' => $gate['reasons'],
            ], 422);
        }

        $delivery = $this->service->create($transaction, $request->user(), $request->validated());

        return response()->json(['data' => new DeliveryResource($delivery)], 201);
    }

    public function changeStatus(ChangeDeliveryStatusRequest $request, Delivery $delivery): JsonResponse
    {
        $updated = $this->service->changeStatus(
            $delivery,
            DeliveryStatus::from($request->validated('status')),
            $request->user(),
        );

        return response()->json(['data' => new DeliveryResource($updated)]);
    }
}
