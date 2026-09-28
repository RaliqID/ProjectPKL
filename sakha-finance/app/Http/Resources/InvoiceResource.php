<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_id' => $this->transaction_id,
            'transaction_code' => $this->whenLoaded('transaction', fn () => $this->transaction->transaction_code),
            'customer_name' => $this->whenLoaded('transaction', fn () => $this->transaction->customer?->name),
            'invoice_number' => $this->invoice_number,
            'invoice_date' => $this->invoice_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'amount' => (string) $this->amount,
            'tax_amount' => (string) $this->tax_amount,
            'total' => bcadd((string) $this->amount, (string) $this->tax_amount, 2),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'document_id' => $this->document_id,
            'paid_amount' => $this->whenLoaded('payments', fn () => $this->confirmedPaidAmount()),
            'remaining_amount' => $this->whenLoaded('payments', fn () => $this->remainingAmount()),
            'days_until_due' => $this->daysUntilDue(),
            'days_overdue' => $this->daysOverdue(),
            'is_overdue' => $this->isOverdue(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
