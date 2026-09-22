<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VerificationRun extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'overall_status',
        'score',
        'pass_count',
        'warning_count',
        'failed_count',
        'run_by',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'pass_count' => 'integer',
            'warning_count' => 'integer',
            'failed_count' => 'integer',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function runner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'run_by');
    }

    public function checks(): HasMany
    {
        return $this->hasMany(VerificationCheck::class);
    }
}
