<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canWrite() ?? false;
    }

    public function rules(): array
    {
        return [
            'invoice_number' => ['required', 'string', 'max:60'],
            'invoice_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:invoice_date'],
            'amount' => ['required', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:DRAFT,ISSUED,PARTIALLY_PAID,PAID,OVERDUE,CANCELLED'],
            'document_id' => ['nullable', 'integer', 'exists:documents,id'],
        ];
    }
}
