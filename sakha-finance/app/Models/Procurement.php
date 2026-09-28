<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Procurement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'procurement_code',
        'spb_number',
        'request_date',
        'item_name',
        'supplier',
        'unit_price',
        'quantity',
        'unit',
        'division',
        'purpose',
        'total_amount',
        'tracking_number',
        'document_id',
        'status',
        'created_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'request_date' => 'date',
            'unit_price' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'quantity' => 'integer',
        ];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
