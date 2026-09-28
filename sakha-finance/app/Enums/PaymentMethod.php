<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case BANK_TRANSFER = 'BANK_TRANSFER';
    case CASH = 'CASH';
    case MARKETPLACE = 'MARKETPLACE';
    case OTHER = 'OTHER';

    public function label(): string
    {
        return match ($this) {
            self::BANK_TRANSFER => 'Transfer Bank',
            self::CASH => 'Tunai',
            self::MARKETPLACE => 'Marketplace',
            self::OTHER => 'Lainnya',
        };
    }

    /** @return array<string> */
    public static function values(): array
    {
        return array_map(fn (self $t) => $t->value, self::cases());
    }
}
