<?php

namespace App\Enums;

enum DeliveryStatus: string
{
    case PREPARING = 'PREPARING';
    case SHIPPED = 'SHIPPED';
    case IN_TRANSIT = 'IN_TRANSIT';
    case DELIVERED = 'DELIVERED';
    case FAILED = 'FAILED';
    case RETURNED = 'RETURNED';

    public function label(): string
    {
        return match ($this) {
            self::PREPARING => 'Disiapkan',
            self::SHIPPED => 'Dikirim',
            self::IN_TRANSIT => 'Dalam Perjalanan',
            self::DELIVERED => 'Terkirim',
            self::FAILED => 'Gagal',
            self::RETURNED => 'Dikembalikan',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::DELIVERED => 'success',
            self::SHIPPED, self::IN_TRANSIT => 'info',
            self::PREPARING => 'neutral',
            self::FAILED, self::RETURNED => 'danger',
        };
    }

    /** @return array<self> */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::PREPARING => [self::SHIPPED, self::FAILED],
            self::SHIPPED => [self::IN_TRANSIT, self::DELIVERED, self::FAILED],
            self::IN_TRANSIT => [self::DELIVERED, self::FAILED, self::RETURNED],
            self::DELIVERED, self::FAILED, self::RETURNED => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }
}
