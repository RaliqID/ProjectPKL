<?php

namespace App\Http\Controllers\Api;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Transaction;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;

class InvoiceController extends Controller
{
    public function __construct(private readonly ActivityLogService $activity) {}

    public function store(StoreInvoiceRequest $request, Transaction $transaction): JsonResponse
    {
        $data = $request->validated();

        $invoice = $transaction->invoices()->create([
            'invoice_number' => $data['invoice_number'],
            'invoice_date' => $data['invoice_date'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'amount' => $data['amount'],
            'tax_amount' => $data['tax_amount'] ?? 0,
            'status' => isset($data['status']) ? InvoiceStatus::from($data['status']) : InvoiceStatus::ISSUED,
            'document_id' => $data['document_id'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $this->activity->logTransaction(
            $transaction->id,
            'invoice.created',
            "Invoice {$invoice->invoice_number} added (Rp ".number_format((float) $invoice->amount, 0, ',', '.').')',
            ['invoice_id' => $invoice->id, 'amount' => (string) $invoice->amount],
        );

        return response()->json(['data' => new InvoiceResource($invoice->load('payments'))], 201);
    }

    public function show(Transaction $transaction, int $invoice): JsonResponse
    {
        $model = $transaction->invoices()->with('payments')->findOrFail($invoice);

        return response()->json(['data' => new InvoiceResource($model)]);
    }
}
