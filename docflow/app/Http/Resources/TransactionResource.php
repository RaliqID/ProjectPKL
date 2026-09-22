<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
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
            'subtotal' => (string) $this->subtotal,
            'discount' => (string) $this->discount,
            'tax' => (string) $this->tax,
            'total_amount' => (string) $this->total_amount,
            'notes' => $this->notes,
            'paid_amount' => $this->whenLoaded('payments', fn () => $this->confirmedPaidAmount()),
            'outstanding_amount' => $this->whenLoaded('payments', fn () => $this->outstandingAmount()),
            'created_by' => $this->created_by,
            'creator_name' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
