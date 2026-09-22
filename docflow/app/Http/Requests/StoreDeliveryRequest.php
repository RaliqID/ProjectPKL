<?php

namespace App\Http\Requests;

use App\Enums\DeliveryStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDeliveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canWrite() ?? false;
    }

    public function rules(): array
    {
        return [
            'courier' => ['required', 'string', 'max:40'],
            'tracking_number' => ['nullable', 'string', 'max:80'],
            'shipping_date' => ['nullable', 'date'],
            'estimated_delivery_date' => ['nullable', 'date', 'after_or_equal:shipping_date'],
            'status' => ['nullable', Rule::enum(DeliveryStatus::class)],
            'recipient_name' => ['nullable', 'string', 'max:255'],
            'delivery_number' => ['nullable', 'string', 'max:60'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
