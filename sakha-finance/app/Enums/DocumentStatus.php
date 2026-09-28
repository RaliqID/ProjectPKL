<?php

namespace App\Enums;

enum DocumentStatus: string
{
    case UPLOADED = 'UPLOADED';
    case UNDER_REVIEW = 'UNDER_REVIEW';
    case VERIFIED = 'VERIFIED';
    case REJECTED = 'REJECTED';
    case ARCHIVED = 'ARCHIVED';

    public function label(): string
    {
        return match ($this) {
            self::UPLOADED => 'Diunggah',
            self::UNDER_REVIEW => 'Sedang Ditinjau',
            self::VERIFIED => 'Terverifikasi',
            self::REJECTED => 'Ditolak',
            self::ARCHIVED => 'Diarsipkan',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::VERIFIED => 'success',
            self::UNDER_REVIEW => 'warning',
            self::REJECTED => 'danger',
            self::ARCHIVED => 'muted',
            default => 'neutral',
        };
    }
}
