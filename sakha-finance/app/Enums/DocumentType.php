<?php

namespace App\Enums;

/**
 * Document types handled by the Finance department.
 *
 * The set mirrors the documents actually processed during the internship:
 * sales invoices, vendor e-faktur / purchase invoices, delivery documents
 * (surat jalan / DO), shipping receipts (resi), handover notes (tanda terima),
 * payment proofs, journals and handover reports (BA).
 *
 * Values are stable identifiers; only label() is shown to users.
 */
enum DocumentType: string
{
    case INVOICE = 'INVOICE';
    case EFAKTUR = 'EFAKTUR';
    case PURCHASE_INVOICE = 'PURCHASE_INVOICE';
    case DELIVERY_ORDER = 'DELIVERY_ORDER';
    case SURAT_JALAN = 'SURAT_JALAN';
    case RECEIPT = 'RECEIPT';
    case RESI = 'RESI';
    case TANDA_TERIMA = 'TANDA_TERIMA';
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
            self::EFAKTUR => 'E-Faktur',
            self::PURCHASE_INVOICE => 'Purchase Invoice',
            self::DELIVERY_ORDER => 'Delivery Order',
            self::SURAT_JALAN => 'Surat Jalan',
            self::RECEIPT => 'Receipt',
            self::RESI => 'Resi',
            self::TANDA_TERIMA => 'Tanda Terima',
            self::PAYMENT_PROOF => 'Bukti Pembayaran',
            self::TAX_INVOICE => 'Faktur Pajak',
            self::PURCHASE_ORDER => 'Purchase Order',
            self::SALES_ORDER => 'Sales Order',
            self::JOURNAL => 'Jurnal',
            self::BA => 'Berita Acara',
            self::OTHER => 'Dokumen Lainnya',
        };
    }

    /** Storage subfolder used inside the per-transaction directory. */
    public function folder(): string
    {
        return match ($this) {
            self::INVOICE => 'invoice',
            self::EFAKTUR => 'efaktur',
            self::PURCHASE_INVOICE => 'purchase_invoice',
            self::DELIVERY_ORDER => 'delivery',
            self::SURAT_JALAN => 'surat_jalan',
            self::RECEIPT => 'receipt',
            self::RESI => 'resi',
            self::TANDA_TERIMA => 'tanda_terima',
            self::PAYMENT_PROOF => 'payment',
            self::TAX_INVOICE => 'tax',
            self::PURCHASE_ORDER => 'purchase',
            self::SALES_ORDER => 'sales',
            self::JOURNAL => 'journal',
            self::BA => 'ba',
            self::OTHER => 'other',
        };
    }

    /**
     * Documents required for a complete Finance transaction file.
     *
     * @return array<self>
     */
    public static function requiredForFinance(): array
    {
        return [self::INVOICE, self::RESI, self::TANDA_TERIMA];
    }

    /** @return array<string> */
    public static function values(): array
    {
        return array_map(fn (self $t) => $t->value, self::cases());
    }
}
