<?php

namespace App\Services;

use App\Enums\TransactionStatus;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransactionService
{
    public function __construct(
        private readonly ActivityLogService $activity,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * Generate the next sequential transaction code for the current year.
     * Uses a DB lock to avoid races on concurrent creation.
     */
    public function nextTransactionCode(?int $year = null): string
    {
        $year ??= (int) now()->format('Y');
        $prefix = "TRX-{$year}-";

        $last = Transaction::withTrashed()
            ->where('transaction_code', 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByDesc('transaction_code')
            ->value('transaction_code');

        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Create a transaction. Totals are ALWAYS recalculated server-side.
     */
    public function create(array $data, User $actor): Transaction
    {
        $subtotal = $this->money($data['subtotal'] ?? 0);
        $discount = $this->money($data['discount'] ?? 0);
        $tax = $this->money($data['tax'] ?? 0);
        $total = $this->calculateTotal($subtotal, $discount, $tax);

        $transaction = DB::transaction(function () use ($data, $actor, $subtotal, $discount, $tax, $total) {
            return Transaction::create([
                'transaction_code' => $data['transaction_code'] ?? $this->nextTransactionCode(),
                'customer_id' => $data['customer_id'],
                'transaction_date' => $data['transaction_date'],
                'status' => TransactionStatus::DRAFT,
                'reference_number' => $data['reference_number'] ?? null,
                'purchase_order_number' => $data['purchase_order_number'] ?? null,
                'sales_order_number' => $data['sales_order_number'] ?? null,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax' => $tax,
                'total_amount' => $total,
                'notes' => $data['notes'] ?? null,
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);
        });

        $this->activity->logTransaction(
            $transaction->id,
            'transaction.created',
            "Transaction {$transaction->transaction_code} created",
            [
                'total_amount' => $total,
                'customer_id' => $transaction->customer_id,
            ],
        );

        return $transaction;
    }

    public function update(Transaction $transaction, array $data, User $actor): Transaction
    {
        $subtotal = $this->money($data['subtotal'] ?? $transaction->subtotal);
        $discount = $this->money($data['discount'] ?? $transaction->discount);
        $tax = $this->money($data['tax'] ?? $transaction->tax);
        $total = $this->calculateTotal($subtotal, $discount, $tax);

        $before = [
            'subtotal' => (string) $transaction->subtotal,
            'discount' => (string) $transaction->discount,
            'tax' => (string) $transaction->tax,
            'total_amount' => (string) $transaction->total_amount,
        ];

        $transaction->fill([
            'customer_id' => $data['customer_id'] ?? $transaction->customer_id,
            'transaction_date' => $data['transaction_date'] ?? $transaction->transaction_date,
            'reference_number' => $data['reference_number'] ?? $transaction->reference_number,
            'purchase_order_number' => $data['purchase_order_number'] ?? $transaction->purchase_order_number,
            'sales_order_number' => $data['sales_order_number'] ?? $transaction->sales_order_number,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'total_amount' => $total,
            'notes' => $data['notes'] ?? $transaction->notes,
            'updated_by' => $actor->id,
        ]);
        $transaction->save();

        $after = [
            'subtotal' => (string) $transaction->subtotal,
            'discount' => (string) $transaction->discount,
            'tax' => (string) $transaction->tax,
            'total_amount' => (string) $transaction->total_amount,
        ];

        $this->activity->logTransaction(
            $transaction->id,
            'transaction.updated',
            "Transaction {$transaction->transaction_code} updated",
            ['before' => $before, 'after' => $after],
        );

        if ($before['total_amount'] !== $after['total_amount']) {
            $this->notifications->notifyTotalChanged($transaction, $before['total_amount'], $after['total_amount']);
        }

        return $transaction->refresh();
    }

    /**
     * Change workflow status, enforcing valid transitions.
     *
     * @param  bool  $override  ADMIN-only escape hatch (requires reason).
     */
    public function changeStatus(Transaction $transaction, TransactionStatus $target, User $actor, ?string $reason = null, bool $override = false): Transaction
    {
        $current = $transaction->status;

        if ($current === $target) {
            $transaction->touch();
            return $transaction;
        }

        $allowed = $current->canTransitionTo($target);

        if (! $allowed && ! $override) {
            $reasons = collect($current->allowedTransitions())
                ->map(fn (TransactionStatus $s) => $s->value)
                ->implode(', ');

            throw ValidationException::withMessages([
                'status' => "Cannot move from {$current->value} to {$target->value}. Allowed: ".($reasons ?: 'none'),
            ]);
        }

        if ($override && ! $actor->isAdmin()) {
            throw ValidationException::withMessages([
                'status' => 'Only an Administrator may override workflow transitions.',
            ]);
        }

        if ($override && ! $reason) {
            throw ValidationException::withMessages([
                'reason' => 'A reason is required when overriding a workflow transition.',
            ]);
        }

        $transaction->forceFill([
            'status' => $target,
            'updated_by' => $actor->id,
        ])->save();

        $this->activity->logTransaction(
            $transaction->id,
            'transaction.status_changed',
            "Status changed from {$current->value} to {$target->value}",
            [
                'from' => $current->value,
                'to' => $target->value,
                'override' => $override,
                'reason' => $reason,
            ],
        );

        return $transaction->refresh();
    }

    // ---- money helpers (bcmath, no float drift) ----

    public function money(mixed $value): string
    {
        return number_format((float) $value, 2, '.', '');
    }

    public function calculateTotal(string $subtotal, string $discount, string $tax): string
    {
        $net = bcsub($subtotal, $discount, 2);
        $gross = bcadd($net, $tax, 2);

        return bccomp($gross, '0', 2) < 0 ? '0.00' : $gross;
    }
}
