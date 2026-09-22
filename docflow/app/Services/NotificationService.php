<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\Transaction;
use App\Models\User;

class NotificationService
{
    public const SEVERITY_LOW = 'LOW';
    public const SEVERITY_MEDIUM = 'MEDIUM';
    public const SEVERITY_HIGH = 'HIGH';

    /**
     * Create a notification addressed to a specific user.
     */
    public function notify(
        ?User $user,
        string $type,
        string $severity,
        string $title,
        string $message,
        ?string $entityType = null,
        ?int $entityId = null,
    ): AppNotification {
        return AppNotification::create([
            'user_id' => $user?->id,
            'type' => $type,
            'severity' => $severity,
            'title' => $title,
            'message' => $message,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
        ]);
    }

    /**
     * Fan a notification out to every active admin/operator/reviewer.
     * Used for operational alerts that any staff member should see.
     */
    public function notifyStaff(
        string $type,
        string $severity,
        string $title,
        string $message,
        ?string $entityType = null,
        ?int $entityId = null,
    ): int {
        $users = User::query()->where('is_active', true)->get();
        $count = 0;

        foreach ($users as $user) {
            $this->notify($user, $type, $severity, $title, $message, $entityType, $entityId);
            $count++;
        }

        return $count;
    }

    public function notifyTotalChanged(Transaction $transaction, string $before, string $after): void
    {
        $this->notifyStaff(
            'transaction_total_changed',
            self::SEVERITY_MEDIUM,
            'Transaction total changed',
            "{$transaction->transaction_code}: total changed from Rp ".
                number_format((float) $before, 0, ',', '.').' to Rp '.
                number_format((float) $after, 0, ',', '.').'.',
            'transaction',
            $transaction->id,
        );
    }

    public function notifyVerificationFailed(Transaction $transaction, int $failedCount): void
    {
        $this->notifyStaff(
            'verification_failed',
            self::SEVERITY_HIGH,
            'Verification failed',
            "{$transaction->transaction_code} has {$failedCount} failed verification check(s).",
            'transaction',
            $transaction->id,
        );
    }

    public function notifyVerificationWarning(Transaction $transaction, int $warningCount): void
    {
        $this->notifyStaff(
            'verification_warning',
            self::SEVERITY_MEDIUM,
            'Verification warning',
            "{$transaction->transaction_code} has {$warningCount} warning(s).",
            'transaction',
            $transaction->id,
        );
    }

    public function notifyDocumentRejected(Transaction $transaction, string $documentLabel): void
    {
        $this->notifyStaff(
            'document_rejected',
            self::SEVERITY_HIGH,
            'Document rejected',
            "{$documentLabel} for {$transaction->transaction_code} was rejected and needs re-upload.",
            'transaction',
            $transaction->id,
        );
    }

    public function notifyOverdueInvoice(Transaction $transaction, int $daysOverdue): void
    {
        $this->notifyStaff(
            'payment_overdue',
            self::SEVERITY_HIGH,
            'Invoice overdue',
            "{$transaction->transaction_code} invoice is {$daysOverdue} day(s) overdue.",
            'transaction',
            $transaction->id,
        );
    }

    public function notifyDeliveryDelayed(Transaction $transaction, int $daysLate): void
    {
        $this->notifyStaff(
            'delivery_delayed',
            self::SEVERITY_MEDIUM,
            'Delivery delayed',
            "{$transaction->transaction_code} delivery is {$daysLate} day(s) past its estimated date.",
            'transaction',
            $transaction->id,
        );
    }
}
