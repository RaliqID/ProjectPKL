<?php

namespace App\Models;

use App\Enums\VerificationStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VerificationCheck extends Model
{
    use HasFactory;

    protected $fillable = [
        'verification_run_id',
        'rule_key',
        'rule_label',
        'status',
        'message',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'status' => VerificationStatus::class,
            'metadata' => 'array',
        ];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(VerificationRun::class, 'verification_run_id');
    }
}
