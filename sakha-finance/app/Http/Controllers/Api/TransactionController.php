<?php

namespace App\Http\Controllers\Api;

use App\Enums\TransactionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ChangeStatusRequest;
use App\Http\Requests\StoreTransactionRequest;
use App\Http\Requests\UpdateTransactionRequest;
use App\Http\Resources\TransactionDetailResource;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Services\TransactionService;
use App\Services\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function __construct(
        private readonly TransactionService $service,
        private readonly WorkflowService $workflow,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Transaction::query()
            ->with(['customer', 'creator', 'payments'])
            ->withCount('documents');

        $this->applyFilters($query, $request);

        $perPage = min((int) $request->integer('per_page', 15), 100);
        $sort = $request->string('sort', 'created_at')->toString();
        $direction = $request->string('direction', 'desc')->toString() === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['created_at', 'transaction_date', 'transaction_code', 'total_amount', 'status'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }

        $paginated = $query->orderBy($sort, $direction)->paginate($perPage)->withQueryString();

        return TransactionResource::collection($paginated)->response();
    }

    public function show(Transaction $transaction): JsonResponse
    {
        $transaction->load([
            'customer', 'creator', 'updater', 'invoices.payments', 'payments',
            'deliveries', 'documents.versions.uploader', 'latestVerificationRun',
        ]);

        $logs = $transaction->activityLogs()->with('user')->latest()->limit(50)->get();
        $transaction->setRelation('activityLogs', $logs);

        return response()->json(['data' => new TransactionDetailResource($transaction)]);
    }

    public function store(StoreTransactionRequest $request): JsonResponse
    {
        $transaction = $this->service->create($request->validated(), $request->user());

        return response()->json(['data' => new TransactionDetailResource($transaction->load('customer', 'payments'))], 201);
    }

    public function update(UpdateTransactionRequest $request, Transaction $transaction): JsonResponse
    {
        $updated = $this->service->update($transaction, $request->validated(), $request->user());

        return response()->json(['data' => new TransactionDetailResource($updated->load('customer', 'payments', 'invoices'))]);
    }

    public function changeStatus(ChangeStatusRequest $request, Transaction $transaction): JsonResponse
    {
        $target = TransactionStatus::from($request->validated('status'));

        $updated = $this->service->changeStatus(
            $transaction,
            $target,
            $request->user(),
            $request->input('reason'),
            (bool) $request->boolean('override'),
        );

        return response()->json(['data' => new TransactionDetailResource($updated->load('customer', 'payments'))]);
    }

    /**
     * Preview the completion gate: reasons the transaction cannot complete yet.
     */
    public function completionCheck(Transaction $transaction): JsonResponse
    {
        return response()->json(['data' => $this->workflow->canCompleteTransaction($transaction)]);
    }

    public function complete(Request $request, Transaction $transaction): JsonResponse
    {
        if (! $request->user()->canWrite()) {
            abort(403, 'Anda tidak berwenang menyelesaikan transaksi.');
        }

        $completed = $this->workflow->complete($transaction, $request->user());

        return response()->json(['data' => new TransactionDetailResource($completed->load('customer', 'payments'))]);
    }

    public function search(Request $request): JsonResponse
    {
        $term = trim($request->string('q')->toString());

        if ($term === '') {
            return response()->json(['data' => []]);
        }

        $like = '%'.$term.'%';

        $transactions = Transaction::query()
            ->with('customer')
            ->where(function ($q) use ($like) {
                $q->where('transaction_code', \App\Support\Search::likeOperator(), $like)
                    ->orWhere('purchase_order_number', \App\Support\Search::likeOperator(), $like)
                    ->orWhere('reference_number', \App\Support\Search::likeOperator(), $like)
                    ->orWhereHas('customer', fn ($c) => $c->where('name', \App\Support\Search::likeOperator(), $like)->orWhere('company_name', \App\Support\Search::likeOperator(), $like))
                    ->orWhereHas('invoices', fn ($i) => $i->where('invoice_number', \App\Support\Search::likeOperator(), $like))
                    ->orWhereHas('deliveries', fn ($d) => $d->where('tracking_number', \App\Support\Search::likeOperator(), $like))
                    ->orWhereHas('payments', fn ($p) => $p->where('payment_reference', \App\Support\Search::likeOperator(), $like));
            })
            ->limit(15)
            ->get();

        $results = $transactions->map(function (Transaction $t) use ($term, $like) {
            $matchType = 'Transaction';
            if (stripos($t->transaction_code, $term) === false) {
                if ($t->purchase_order_number && stripos($t->purchase_order_number, $term) !== false) {
                    $matchType = 'Purchase Order';
                } elseif ($t->customer && stripos((string) $t->customer->name, $term) !== false) {
                    $matchType = 'Customer';
                } else {
                    $matchType = 'Related';
                }
            }

            return [
                'entity_type' => 'transaction',
                'label' => $t->transaction_code,
                'match_type' => $matchType,
                'customer' => $t->customer?->name,
                'status' => $t->status->value,
                'transaction_id' => $t->id,
            ];
        });

        return response()->json(['data' => $results]);
    }

    private function applyFilters($query, Request $request): void
    {
        if ($status = $request->string('status')->toString()) {
            $statuses = array_filter(explode(',', $status));
            if ($statuses) {
                $query->whereIn('status', $statuses);
            }
        }

        if ($customerId = $request->integer('customer_id')) {
            $query->where('customer_id', $customerId);
        }

        if ($from = $request->string('date_from')->toString()) {
            $query->whereDate('transaction_date', '>=', $from);
        }

        if ($to = $request->string('date_to')->toString()) {
            $query->whereDate('transaction_date', '<=', $to);
        }

        if ($request->filled('min_amount')) {
            $query->where('total_amount', '>=', $request->input('min_amount'));
        }

        if ($request->filled('max_amount')) {
            $query->where('total_amount', '<=', $request->input('max_amount'));
        }

        if ($paymentStatus = $request->string('payment_status')->toString()) {
            if ($paymentStatus === 'PAID') {
                $query->whereHas('payments', fn ($q) => $q->where('status', 'CONFIRMED'))
                    ->whereRaw('(SELECT COALESCE(SUM(amount),0) FROM payments WHERE payments.transaction_id = transactions.id AND payments.status = ?) >= transactions.total_amount', ['CONFIRMED']);
            } elseif ($paymentStatus === 'UNPAID') {
                $query->whereDoesntHave('payments', fn ($q) => $q->where('status', 'CONFIRMED'));
            } elseif ($paymentStatus === 'PARTIAL') {
                $query->whereHas('payments', fn ($q) => $q->where('status', 'CONFIRMED'))
                    ->whereRaw('(SELECT COALESCE(SUM(amount),0) FROM payments WHERE payments.transaction_id = transactions.id AND payments.status = ?) < transactions.total_amount', ['CONFIRMED']);
            }
        }

        if ($deliveryStatus = $request->string('delivery_status')->toString()) {
            $query->whereHas('deliveries', fn ($q) => $q->where('status', $deliveryStatus));
        }

        if ($verification = $request->string('verification_status')->toString()) {
            $query->whereHas('latestVerificationRun', fn ($q) => $q->where('overall_status', $verification));
        }

        if ($term = $request->string('q')->toString()) {
            $like = '%'.$term.'%';
            $query->where(function ($q) use ($like) {
                $q->where('transaction_code', \App\Support\Search::likeOperator(), $like)
                    ->orWhere('purchase_order_number', \App\Support\Search::likeOperator(), $like)
                    ->orWhereHas('customer', fn ($c) => $c->where('name', \App\Support\Search::likeOperator(), $like));
            });
        }
    }
}
