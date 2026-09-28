<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
            // Public sign-ups may choose OPERATOR or REVIEWER. ADMIN is never
            // self-assigned — it must be granted by an existing administrator.
            'role' => ['nullable', Rule::in([UserRole::OPERATOR->value, UserRole::REVIEWER->value])],
        ];
    }

    public function messages(): array
    {
        return [
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
            'email.unique' => 'Akun dengan email ini sudah terdaftar.',
        ];
    }
}
