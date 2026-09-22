<?php

namespace App\Models;

use App\Enums\DeliveryStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Delivery extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'delivery_number',
        'courier',
        'tracking_number',
        'shipping_date',
        'estimated_delivery_date',
        'delivered_at',
        'status',
        'recipient_name',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'shipping_date' => 'date',
            'estimated_delivery_date' => 'date',
            'delivered_at' => 'datetime',
            'status' => DeliveryStatus::class,
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function isDelayed(): bool
    {
        if ($this->status === DeliveryStatus::DELIVERED) {
            return false;
        }

        if (! $this->estimated_delivery_date) {
            return false;
        }

        return $this->estimated_delivery_date->isPast();
    }
}
