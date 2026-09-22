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
            self::UPLOADED => 'Uploaded',
            self::UNDER_REVIEW => 'Under Review',
            self::VERIFIED => 'Verified',
            self::REJECTED => 'Rejected',
            self::ARCHIVED => 'Archived',
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
