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
            self::PENDING => 'Menunggu',
            self::CONFIRMED => 'Terkonfirmasi',
            self::REJECTED => 'Ditolak',
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
