<?php

namespace App\Http\Resources;

use App\Enums\DocumentType;
use App\Http\Controllers\Controller;
use App\Models\Archive;
use Illuminate\Http\Request;

class ArchiveResource extends \Illuminate\Http\Resources\Json\JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Archive $a */
        $a = $this->resource;

        return [
            'id' => $a->id,
            'archive_code' => $a->archive_code,
            'document_type' => $a->document_type instanceof DocumentType ? $a->document_type->value : $a->document_type,
            'document_type_label' => $a->document_type instanceof DocumentType ? $a->document_type->label() : null,
            'document_name' => $a->document_name,
            'document_number' => $a->document_number,
            'file_name' => $a->file_name,
            'document_date' => $a->document_date?->toDateString(),
            'period_year' => $a->period_year,
            'period_month' => $a->period_month,
            'archive_location' => $a->archive_location,
            'status' => $a->status,
            'customer' => $a->customer ? ['id' => $a->customer->id, 'name' => $a->customer->name] : null,
            'customer_name' => $a->customer?->name,
            'transaction_id' => $a->transaction_id,
            'transaction_code' => $a->transaction?->transaction_code,
            'document_id' => $a->document_id,
            'notes' => $a->notes,
            'created_at' => $a->created_at?->toIso8601String(),
            'updated_at' => $a->updated_at?->toIso8601String(),
        ];
    }
}
