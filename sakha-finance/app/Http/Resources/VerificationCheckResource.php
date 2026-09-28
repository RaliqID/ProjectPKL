<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VerificationCheckResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rule_key' => $this->rule_key,
            'rule_label' => $this->rule_label,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'message' => $this->message,
            'metadata' => $this->metadata,
        ];
    }
}
