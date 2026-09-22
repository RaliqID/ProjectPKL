<?php

namespace App\Http\Requests;

use App\Enums\TransactionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangeStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canWrite() ?? false;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(TransactionStatus::class)],
            'reason' => ['nullable', 'string', 'max:500'],
            'override' => ['nullable', 'boolean'],
        ];
    }
}
