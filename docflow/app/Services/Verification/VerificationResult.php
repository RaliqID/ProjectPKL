<?php

namespace App\Services\Verification;

use App\Enums\VerificationStatus;

/**
 * Outcome of a single verification rule.
 */
class VerificationResult
{
    public function __construct(
        public readonly string $key,
        public readonly string $label,
        public readonly VerificationStatus $status,
        public readonly string $message,
        public readonly array $metadata = [],
    ) {}

    public static function pass(string $key, string $label, string $message, array $metadata = []): self
    {
        return new self($key, $label, VerificationStatus::PASS, $message, $metadata);
    }

    public static function warning(string $key, string $label, string $message, array $metadata = []): self
    {
        return new self($key, $label, VerificationStatus::WARNING, $message, $metadata);
    }

    public static function failed(string $key, string $label, string $message, array $metadata = []): self
    {
        return new self($key, $label, VerificationStatus::FAILED, $message, $metadata);
    }
}
