<?php

namespace App\Services;

use App\Enums\DeliveryStatus;
use App\Models\Delivery;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class DeliveryService
{
    public function __construct(private readonly ActivityLogService $activity) {}

    public function create(Transaction $transaction, User $actor, array $data): Delivery
    {
        $delivery = Delivery::create([
            'transaction_id' => $transaction->id,
            'delivery_number' => $data['delivery_number'] ?? $this->nextDeliveryNumber(),
            'courier' => $data['courier'],
            'tracking_number' => $data['tracking_number'] ?? null,
            'shipping_date' => $data['shipping_date'] ?? null,
            'estimated_delivery_date' => $data['estimated_delivery_date'] ?? null,
            'status' => $data['status'] ?? DeliveryStatus::PREPARING,
            'recipient_name' => $data['recipient_name'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        $this->activity->logTransaction(
            $transaction->id,
            'delivery.created',
            "Delivery created via {$delivery->courier}".($delivery->tracking_number ? " ({$delivery->tracking_number})" : ''),
            ['delivery_id' => $delivery->id, 'courier' => $delivery->courier, 'tracking' => $delivery->tracking_number],
        );

        return $delivery->refresh();
    }

    public function changeStatus(Delivery $delivery, DeliveryStatus $target, User $actor): Delivery
    {
        $current = $delivery->status;

        if ($current === $target) {
            return $delivery;
        }

        if (! $current->canTransitionTo($target)) {
            $allowed = collect($current->allowedTransitions())
                ->map(fn (DeliveryStatus $s) => $s->value)->implode(', ');

            throw ValidationException::withMessages([
                'status' => "Cannot move delivery from {$current->value} to {$target->value}. Allowed: ".($allowed ?: 'none'),
            ]);
        }

        $delivery->forceFill([
            'status' => $target,
            'delivered_at' => $target === DeliveryStatus::DELIVERED ? now() : $delivery->delivered_at,
        ])->save();

        $this->activity->logTransaction(
            $delivery->transaction_id,
            'delivery.status_changed',
            "Delivery status changed from {$current->value} to {$target->value}",
            ['from' => $current->value, 'to' => $target->value],
        );

        // Advance the transaction into IN_DELIVERY when shipping starts.
        $transaction = $delivery->transaction;
        if ($transaction && in_array($target, [DeliveryStatus::SHIPPED, DeliveryStatus::IN_TRANSIT], true)) {
            $status = $transaction->status;
            if ($status === \App\Enums\TransactionStatus::PREPARING_DELIVERY) {
                $transaction->forceFill(['status' => \App\Enums\TransactionStatus::IN_DELIVERY])->save();
            }
        }

        return $delivery->refresh();
    }

    private function nextDeliveryNumber(): string
    {
        $prefix = 'DO-'.now()->format('Y').'-';
        $last = Delivery::where('delivery_number', 'like', $prefix.'%')
            ->orderByDesc('delivery_number')
            ->value('delivery_number');

        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }
}
