<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VerificationRunResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_id' => $this->transaction_id,
            'overall_status' => $this->overall_status,
            'score' => $this->score,
            'pass_count' => $this->pass_count,
            'warning_count' => $this->warning_count,
            'failed_count' => $this->failed_count,
            'run_by' => $this->run_by,
            'runner_name' => $this->whenLoaded('runner', fn () => $this->runner?->name),
            'checks' => VerificationCheckResource::collection($this->whenLoaded('checks')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
