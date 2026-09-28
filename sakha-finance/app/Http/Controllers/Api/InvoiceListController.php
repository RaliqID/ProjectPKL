<?php

namespace App\Http\Controllers\Api;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Invoice module — a cross-transaction view of all invoices.
 *
 * The existing InvoiceController handles creating/showing an invoice within a
 * transaction; this controller provides the Finance-level listing with filters
 * and an outstanding summary.
 */
class InvoiceListController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::query()
            ->with(['transaction.customer', 'payments'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($w) use ($term) {
                    $w->where('invoice_number', 'ilike', $term)
                        ->orWhereHas('transaction', fn ($t) => $t->where('transaction_code', 'ilike', $term))
                        ->orWhereHas('transaction.customer', fn ($c) => $c->where('name', 'ilike', $term));
                });
            })
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('overdue'), function ($q) {
                if ($request->boolean('overdue')) {
                    $q->whereNotNull('due_date')
                        ->whereDate('due_date', '<', now()->toDateString())
                        ->whereNotIn('status', [InvoiceStatus::PAID->value, InvoiceStatus::CANCELLED->value]);
                }
            })
            ->latest('invoice_date')
            ->latest('id');

        $perPage = min((int) $request->integer('per_page', 20), 100);
        $paginated = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => InvoiceResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'summary' => $this->summary(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(): array
    {
        $rows = Invoice::query()->with('payments')->get();

        $invoiced = $rows->reduce(fn ($c, $i) => $c + (float) $i->amount + (float) $i->tax_amount, 0.0);
        $paid = $rows->reduce(function ($c, Invoice $i) {
            return $c + (float) $i->payments->where('status', \App\Enums\PaymentStatus::CONFIRMED)->sum('amount');
        }, 0.0);

        return [
            'total' => $rows->count(),
            'unpaid' => $rows->whereIn('status', [InvoiceStatus::ISSUED, InvoiceStatus::PARTIALLY_PAID, InvoiceStatus::OVERDUE])->count(),
            'paid' => $rows->where('status', InvoiceStatus::PAID)->count(),
            'overdue' => $rows->filter(fn (Invoice $i) => $i->isOverdue())->count(),
            'invoiced_amount' => (string) number_format($invoiced, 2, '.', ''),
            'paid_amount' => (string) number_format($paid, 2, '.', ''),
            'outstanding_amount' => (string) number_format(max($invoiced - $paid, 0), 2, '.', ''),
        ];
    }
}
