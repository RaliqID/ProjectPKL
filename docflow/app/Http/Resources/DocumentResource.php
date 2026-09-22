<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_id' => $this->transaction_id,
            'document_type' => $this->document_type->value,
            'document_type_label' => $this->document_type->label(),
            'original_filename' => $this->original_filename,
            'stored_filename' => $this->stored_filename,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'file_size_label' => $this->humanSize($this->file_size),
            'document_number' => $this->document_number,
            'transaction_code' => $this->whenLoaded('transaction', fn () => $this->transaction?->transaction_code),
            'uploaded_by' => $this->uploaded_by,
            'uploader_name' => $this->whenLoaded('uploader', fn () => $this->uploader?->name),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'current_version' => $this->current_version,
            'is_previewable' => $this->isPreviewable(),
            'verified_at' => $this->verified_at?->toIso8601String(),
            'uploaded_at' => $this->created_at?->toIso8601String(),
            'versions' => DocumentVersionResource::collection($this->whenLoaded('versions')),
        ];
    }

    private function humanSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        $size = (float) $bytes;
        while ($size >= 1024 && $i < count($units) - 1) {
            $size /= 1024;
            $i++;
        }

        return round($size, $i === 0 ? 0 : 1).' '.$units[$i];
    }
}
