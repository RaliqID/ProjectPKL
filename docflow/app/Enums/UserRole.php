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
            self::REVIEWER => 'Reviewer',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::ADMIN => 'Full access, user & master data management, workflow overrides.',
            self::OPERATOR => 'Create/update transactions, documents, payments, deliveries.',
            self::REVIEWER => 'Review verification results, approve/reject documents, audit view.',
        };
    }
}
