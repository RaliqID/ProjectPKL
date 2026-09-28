<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'ADMIN';
    case OPERATOR = 'OPERATOR';
    case REVIEWER = 'REVIEWER';

    public function label(): string
    {
        return match ($this) {
            self::ADMIN => 'Administrator',
            self::OPERATOR => 'Operator',
            self::REVIEWER => 'Pemeriksa',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::ADMIN => 'Akses penuh, pengelolaan pengguna & data master, serta penyesuaian alur kerja.',
            self::OPERATOR => 'Membuat/memperbarui transaksi, dokumen, pembayaran, dan pengiriman.',
            self::REVIEWER => 'Meninjau hasil verifikasi, menyetujui/menolak dokumen, dan melihat riwayat.',
        };
    }
}
