<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Full operational view of a transaction: the entities the user needs to
 * understand the lifecycle without jumping between pages.
 */
class TransactionDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_code' => $this->transaction_code,
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'customer_id' => $this->customer_id,
            'transaction_date' => $this->transaction_date?->toDateString(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_tone' => $this->status->tone(),
            'reference_number' => $this->reference_number,
            'purchase_order_number' => $this->purchase_order_number,
            'sales_order_number' => $this->sales_order_number,
            'notes' => $this->notes,

            'financial' => [
                'subtotal' => (string) $this->subtotal,
                'discount' => (string) $this->discount,
                'tax' => (string) $this->tax,
                'total_amount' => (string) $this->total_amount,
                'paid_amount' => $this->confirmedPaidAmount(),
                'outstanding_amount' => $this->outstandingAmount(),
            ],

            'invoices' => InvoiceResource::collection($this->whenLoaded('invoices')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'deliveries' => DeliveryResource::collection($this->whenLoaded('deliveries')),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),

            'verification' => $this->whenLoaded('latestVerificationRun', fn () => $this->latestVerificationRun
                ? new VerificationRunResource($this->latestVerificationRun->load('checks', 'runner'))
                : null),

            'timeline' => ActivityLogResource::collection($this->whenLoaded('activityLogs')),

            'allowed_transitions' => array_map(
                fn ($s) => ['value' => $s->value, 'label' => $s->label()],
                $this->status->allowedTransitions(),
            ),

            'workflow' => [
                // $this->resource is the underlying Transaction model.
                'can_complete' => app(\App\Services\WorkflowService::class)->canCompleteTransaction($this->resource),
            ],

            'creator_name' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
