<?php

namespace App\Enums;

/**
 * Central status configuration for transactions.
 * Kept in ONE place so UI and workflow engine never disagree.
 *
 * Values are stable machine identifiers (never translated); only the label()
 * shown to users is Indonesian.
 */
enum TransactionStatus: string
{
    case DRAFT = 'DRAFT';
    case PROCESSING = 'PROCESSING';
    case AWAITING_PAYMENT = 'AWAITING_PAYMENT';
    case PAID = 'PAID';
    case PREPARING_DELIVERY = 'PREPARING_DELIVERY';
    case IN_DELIVERY = 'IN_DELIVERY';
    case DELIVERED = 'DELIVERED';
    case COMPLETED = 'COMPLETED';
    case NEEDS_REVIEW = 'NEEDS_REVIEW';
    case CANCELLED = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Draf',
            self::PROCESSING => 'Diproses',
            self::AWAITING_PAYMENT => 'Menunggu Pembayaran',
            self::PAID => 'Dibayar',
            self::PREPARING_DELIVERY => 'Siap Kirim',
            self::IN_DELIVERY => 'Dalam Pengiriman',
            self::DELIVERED => 'Terkirim',
            self::COMPLETED => 'Selesai',
            self::NEEDS_REVIEW => 'Perlu Diperiksa',
            self::CANCELLED => 'Dibatalkan',
        };
    }

    /** Visual treatment key consumed by the frontend badge. */
    public function tone(): string
    {
        return match ($this) {
            self::COMPLETED => 'success',
            self::DELIVERED, self::IN_DELIVERY, self::PREPARING_DELIVERY => 'info',
            self::PAID => 'success',
            self::AWAITING_PAYMENT => 'warning',
            self::NEEDS_REVIEW => 'danger',
            self::CANCELLED => 'muted',
            default => 'neutral',
        };
    }

    /**
     * Allowed forward transitions. NEEDS_REVIEW and CANCELLED are reachable
     * from most active states (workflow issue / override).
     *
     * @return array<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::DRAFT => [self::PROCESSING, self::NEEDS_REVIEW, self::CANCELLED],
            self::PROCESSING => [self::AWAITING_PAYMENT, self::NEEDS_REVIEW, self::CANCELLED],
            self::AWAITING_PAYMENT => [self::PAID, self::NEEDS_REVIEW, self::CANCELLED],
            self::PAID => [self::PREPARING_DELIVERY, self::NEEDS_REVIEW],
            self::PREPARING_DELIVERY => [self::IN_DELIVERY, self::NEEDS_REVIEW],
            self::IN_DELIVERY => [self::DELIVERED, self::NEEDS_REVIEW],
            self::DELIVERED => [self::COMPLETED, self::NEEDS_REVIEW],
            self::NEEDS_REVIEW => [
                self::DRAFT, self::PROCESSING, self::AWAITING_PAYMENT, self::PAID,
                self::PREPARING_DELIVERY, self::IN_DELIVERY, self::DELIVERED, self::CANCELLED,
            ],
            self::COMPLETED => [],
            self::CANCELLED => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::COMPLETED, self::CANCELLED], true);
    }

    public function isActive(): bool
    {
        return ! $this->isTerminal();
    }
}
