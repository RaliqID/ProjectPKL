<?php

namespace App\Models;

use App\Enums\TransactionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'transaction_code',
        'customer_id',
        'transaction_date',
        'status',
        'reference_number',
        'purchase_order_number',
        'sales_order_number',
        'subtotal',
        'discount',
        'tax',
        'total_amount',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
            'status' => TransactionStatus::class,
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax' => 'decimal:2',
            'total_amount' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function verificationRuns(): HasMany
    {
        return $this->hasMany(VerificationRun::class)->latest();
    }

    public function latestVerificationRun(): HasOne
    {
        return $this->hasOne(VerificationRun::class)->latestOfMany();
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class, 'entity_id')
            ->where('entity_type', 'transaction')
            ->latest();
    }

    public function confirmedPaidAmount(): string
    {
        $sum = $this->payments
            ->where('status', \App\Enums\PaymentStatus::CONFIRMED)
            ->reduce(fn ($carry, $p) => bcadd($carry, (string) $p->amount, 2), '0.00');

        return $sum;
    }

    public function outstandingAmount(): string
    {
        $outstanding = bcsub((string) $this->total_amount, $this->confirmedPaidAmount(), 2);

        return bccomp($outstanding, '0', 2) < 0 ? '0.00' : $outstanding;
    }

    public function hasPayment(): bool
    {
        return $this->payments->isNotEmpty();
    }

    public function isFullyPaid(): bool
    {
        return bccomp($this->outstandingAmount(), '0', 2) === 0
            && bccomp($this->confirmedPaidAmount(), '0', 2) > 0;
    }
}
