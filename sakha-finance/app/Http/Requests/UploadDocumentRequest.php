<?php

namespace App\Http\Requests;

use App\Enums\DocumentType;
use App\Services\DocumentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canWrite() ?? false;
    }

    public function rules(): array
    {
        $maxKb = (int) (DocumentService::MAX_FILE_SIZE / 1024);

        return [
            'file' => [
                'required',
                'file',
                'max:'.$maxKb,
                'mimes:'.implode(',', DocumentService::ALLOWED_EXTENSIONS),
            ],
            'document_type' => ['required', Rule::enum(DocumentType::class)],
            'document_number' => ['nullable', 'string', 'max:80'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.mimes' => 'Jenis berkas tidak didukung. Diizinkan: PDF, JPG, PNG, WEBP.',
            'file.max' => 'Ukuran berkas melebihi batas 10 MB.',
        ];
    }
}
