<?php

namespace App\Enums;

enum VerificationStatus: string
{
    case PASS = 'PASS';
    case WARNING = 'WARNING';
    case FAILED = 'FAILED';

    public function label(): string
    {
        return match ($this) {
            self::PASS => 'Pass',
            self::WARNING => 'Warning',
            self::FAILED => 'Failed',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::PASS => 'success',
            self::WARNING => 'warning',
            self::FAILED => 'danger',
        };
    }

    /** Worst-first ordering helper. */
    public function weight(): int
    {
        return match ($this) {
            self::PASS => 0,
            self::WARNING => 1,
            self::FAILED => 2,
        };
    }
}
