<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'transaction_id',
        'invoice_number',
        'invoice_date',
        'due_date',
        'amount',
        'tax_amount',
        'status',
        'document_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'due_date' => 'date',
            'status' => InvoiceStatus::class,
            'amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function confirmedPaidAmount(): string
    {
        return $this->payments
            ->where('status', \App\Enums\PaymentStatus::CONFIRMED)
            ->reduce(fn ($carry, $p) => bcadd($carry, (string) $p->amount, 2), '0.00');
    }

    public function remainingAmount(): string
    {
        $remaining = bcsub((string) $this->amount, $this->confirmedPaidAmount(), 2);

        return bccomp($remaining, '0', 2) < 0 ? '0.00' : $remaining;
    }

    public function daysUntilDue(): ?int
    {
        if (! $this->due_date) {
            return null;
        }

        return (int) now()->startOfDay()->diffInDays($this->due_date->startOfDay(), false);
    }

    public function daysOverdue(): int
    {
        $days = $this->daysUntilDue();

        return $days !== null && $days < 0 ? abs($days) : 0;
    }

    public function isOverdue(): bool
    {
        return $this->daysOverdue() > 0
            && ! in_array($this->status, [InvoiceStatus::PAID, InvoiceStatus::CANCELLED], true);
    }
}
