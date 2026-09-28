<?php

namespace App\Services\Verification\Rules;

use App\Enums\DeliveryStatus;
use App\Models\Transaction;
use App\Services\Verification\VerificationResult;
use App\Services\Verification\VerificationRule;

/**
 * Delivery must exist with a tracking number once the transaction has moved
 * into a delivery stage. Late deliveries are flagged.
 */
class DeliveryTrackingRule implements VerificationRule
{
    public function key(): string
    {
        return 'delivery_tracking';
    }

    public function label(): string
    {
        return 'Delivery Tracking';
    }

    public function evaluate(Transaction $transaction): VerificationResult
    {
        $transaction->loadMissing('deliveries');
        $delivery = $transaction->deliveries->sortByDesc('id')->first();

        if (! $delivery) {
            $status = $transaction->status;

            // Delivery is not expected before the PAID stage.
            if (in_array($status->value, ['DRAFT', 'PROCESSING', 'AWAITING_PAYMENT', 'PAID'], true)) {
                return VerificationResult::warning(
                    $this->key(),
                    $this->label(),
                    'No delivery created yet for this stage.',
                );
            }

            return VerificationResult::failed(
                $this->key(),
                $this->label(),
                'Transaction is in a delivery stage but no delivery record exists.',
            );
        }

        if (! $delivery->tracking_number) {
            return VerificationResult::failed(
                $this->key(),
                $this->label(),
                'Delivery is missing a tracking number.',
                ['courier' => $delivery->courier, 'status' => $delivery->status->value],
            );
        }

        if ($delivery->isDelayed()) {
            $days = (int) $delivery->estimated_delivery_date->startOfDay()->diffInDays(now()->startOfDay(), false) * -1;

            return VerificationResult::warning(
                $this->key(),
                $this->label(),
                'Delivery is past its estimated delivery date.',
                [
                    'courier' => $delivery->courier,
                    'tracking_number' => $delivery->tracking_number,
                    'status' => $delivery->status->value,
                    'days_late' => max($days, 1),
                ],
            );
        }

        if ($delivery->status === DeliveryStatus::DELIVERED) {
            return VerificationResult::pass(
                $this->key(),
                $this->label(),
                'Delivery completed with tracking recorded.',
                ['courier' => $delivery->courier, 'tracking_number' => $delivery->tracking_number],
            );
        }

        return VerificationResult::pass(
            $this->key(),
            $this->label(),
            'Delivery in progress with a tracking number.',
            ['courier' => $delivery->courier, 'tracking_number' => $delivery->tracking_number, 'status' => $delivery->status->value],
        );
    }
}
