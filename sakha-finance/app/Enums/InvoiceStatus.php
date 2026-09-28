<?php

namespace App\Enums;

enum InvoiceStatus: string
{
    case DRAFT = 'DRAFT';
    case ISSUED = 'ISSUED';
    case PARTIALLY_PAID = 'PARTIALLY_PAID';
    case PAID = 'PAID';
    case OVERDUE = 'OVERDUE';
    case CANCELLED = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Draf',
            self::ISSUED => 'Diterbitkan',
            self::PARTIALLY_PAID => 'Sebagian Dibayar',
            self::PAID => 'Lunas',
            self::OVERDUE => 'Jatuh Tempo',
            self::CANCELLED => 'Dibatalkan',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::PAID => 'success',
            self::PARTIALLY_PAID => 'warning',
            self::OVERDUE => 'danger',
            self::ISSUED => 'info',
            self::CANCELLED => 'muted',
            default => 'neutral',
        };
    }
}
