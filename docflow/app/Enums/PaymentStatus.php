<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case PENDING = 'PENDING';
    case CONFIRMED = 'CONFIRMED';
    case REJECTED = 'REJECTED';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::CONFIRMED => 'Confirmed',
            self::REJECTED => 'Rejected',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::CONFIRMED => 'success',
            self::PENDING => 'warning',
            self::REJECTED => 'danger',
        };
    }
}
