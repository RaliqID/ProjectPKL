<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeliveryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_id' => $this->transaction_id,
            'delivery_number' => $this->delivery_number,
            'courier' => $this->courier,
            'tracking_number' => $this->tracking_number,
            'shipping_date' => $this->shipping_date?->toDateString(),
            'estimated_delivery_date' => $this->estimated_delivery_date?->toDateString(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'recipient_name' => $this->recipient_name,
            'notes' => $this->notes,
            'is_delayed' => $this->isDelayed(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
