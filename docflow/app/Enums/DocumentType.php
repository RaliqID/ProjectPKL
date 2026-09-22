<?php

namespace App\Enums;

enum DocumentType: string
{
    case INVOICE = 'INVOICE';
    case DELIVERY_ORDER = 'DELIVERY_ORDER';
    case RECEIPT = 'RECEIPT';
    case PAYMENT_PROOF = 'PAYMENT_PROOF';
    case TAX_INVOICE = 'TAX_INVOICE';
    case PURCHASE_ORDER = 'PURCHASE_ORDER';
    case SALES_ORDER = 'SALES_ORDER';
    case JOURNAL = 'JOURNAL';
    case BA = 'BA';
    case OTHER = 'OTHER';

    public function label(): string
    {
        return match ($this) {
            self::INVOICE => 'Invoice',
            self::DELIVERY_ORDER => 'Delivery Order',
            self::RECEIPT => 'Receipt',
            self::PAYMENT_PROOF => 'Payment Proof',
            self::TAX_INVOICE => 'Tax Invoice',
            self::PURCHASE_ORDER => 'Purchase Order',
            self::SALES_ORDER => 'Sales Order',
            self::JOURNAL => 'Journal',
            self::BA => 'Berita Acara',
            self::OTHER => 'Other',
        };
    }

    /** Storage subfolder used inside the per-transaction directory. */
    public function folder(): string
    {
        return match ($this) {
            self::INVOICE => 'invoice',
            self::DELIVERY_ORDER => 'delivery',
            self::RECEIPT => 'receipt',
            self::PAYMENT_PROOF => 'payment',
            self::TAX_INVOICE => 'tax',
            self::PURCHASE_ORDER => 'purchase',
            self::SALES_ORDER => 'sales',
            self::JOURNAL => 'journal',
            self::BA => 'ba',
            self::OTHER => 'other',
        };
    }

    /** @return array<string> */
    public static function values(): array
    {
        return array_map(fn (self $t) => $t->value, self::cases());
    }
}
