<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\TransactionResource;
use App\Models\Customer;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function __construct(private readonly ActivityLogService $activity) {}

    public function index(Request $request): JsonResponse
    {
        $query = Customer::query()->withCount('transactions');

        if ($term = $request->string('q')->toString()) {
            $like = '%'.$term.'%';
            $query->where(function ($q) use ($like) {
                $q->where('name', \App\Support\Search::likeOperator(), $like)
                    ->orWhere('company_name', \App\Support\Search::likeOperator(), $like)
                    ->orWhere('customer_code', \App\Support\Search::likeOperator(), $like)
                    ->orWhere('email', \App\Support\Search::likeOperator(), $like);
            });
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->integer('per_page', 15), 100);
        $paginated = $query->orderBy('name')->paginate($perPage)->withQueryString();

        return CustomerResource::collection($paginated)->response();
    }

    public function show(Customer $customer): JsonResponse
    {
        $customer->loadCount('transactions');
        $recent = $customer->transactions()->with('payments')->latest()->limit(10)->get();

        $outstanding = $customer->transactions()
            ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
            ->with('payments')
            ->get()
            ->reduce(fn ($carry, $t) => bcadd($carry, $t->outstandingAmount(), 2), '0.00');

        return response()->json([
            'data' => [
                'customer' => new CustomerResource($customer),
                'outstanding_amount' => $outstanding,
                'recent_transactions' => TransactionResource::collection($recent),
            ],
        ]);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['customer_code'] = $this->nextCode();
        $data['status'] = $data['status'] ?? 'ACTIVE';

        $customer = Customer::create($data);

        $this->activity->log('customer', $customer->id, 'customer.created', "Customer {$customer->name} created");

        return response()->json(['data' => new CustomerResource($customer)], 201);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $before = $customer->only(['name', 'status', 'email', 'phone']);
        $customer->update($request->validated());

        $this->activity->log('customer', $customer->id, 'customer.updated', "Customer {$customer->name} updated", [
            'before' => $before,
            'after' => $customer->only(['name', 'status', 'email', 'phone']),
        ]);

        return response()->json(['data' => new CustomerResource($customer)]);
    }

    private function nextCode(): string
    {
        $last = Customer::query()->orderByDesc('id')->value('customer_code');
        $next = 1;
        if ($last && preg_match('/(\d+)$/', $last, $m)) {
            $next = ((int) $m[1]) + 1;
        }

        return 'CUST-'.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
