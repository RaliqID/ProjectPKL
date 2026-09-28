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

    private function rupiah(string $value): string
    {
        return 'Rp '.number_format((float) $value, 0, ',', '.');
    }

    public function notifyTotalChanged(Transaction $transaction, string $before, string $after): void
    {
        $this->notifyStaff(
            'transaction_total_changed',
            self::SEVERITY_MEDIUM,
            'Nilai transaksi berubah',
            "{$transaction->transaction_code}: nilai berubah dari {$this->rupiah($before)} menjadi {$this->rupiah($after)}.",
            'transaction',
            $transaction->id,
        );
    }

    public function notifyVerificationFailed(Transaction $transaction, int $failedCount): void
    {
        $this->notifyStaff(
            'verification_failed',
            self::SEVERITY_HIGH,
            'Verifikasi tidak sesuai',
            "{$transaction->transaction_code} memiliki {$failedCount} pemeriksaan yang tidak sesuai.",
            'transaction',
            $transaction->id,
        );
    }

    public function notifyVerificationWarning(Transaction $transaction, int $warningCount): void
    {
        $this->notifyStaff(
            'verification_warning',
            self::SEVERITY_MEDIUM,
            'Verifikasi perlu diperiksa',
            "{$transaction->transaction_code} memiliki {$warningCount} pemeriksaan yang perlu diperiksa.",
            'transaction',
            $transaction->id,
        );
    }

    public function notifyDocumentRejected(Transaction $transaction, string $documentLabel): void
    {
        $this->notifyStaff(
            'document_rejected',
            self::SEVERITY_HIGH,
            'Dokumen ditolak',
            "{$documentLabel} untuk {$transaction->transaction_code} ditolak dan perlu diunggah ulang.",
            'transaction',
            $transaction->id,
        );
    }

    /** Dokumen wajib belum lengkap pada sebuah transaksi. */
    public function notifyMissingDocuments(Transaction $transaction, string $documentLabels): void
    {
        $this->notifyStaff(
            'document_missing',
            self::SEVERITY_HIGH,
            'Dokumen wajib belum lengkap',
            "{$transaction->transaction_code} belum melengkapi: {$documentLabels}.",
            'transaction',
            $transaction->id,
        );
    }

    public function notifyOverdueInvoice(Transaction $transaction, int $daysOverdue): void
    {
        $this->notifyStaff(
            'payment_overdue',
            self::SEVERITY_HIGH,
            'Invoice jatuh tempo',
            "Invoice {$transaction->transaction_code} telah lewat jatuh tempo {$daysOverdue} hari.",
            'transaction',
            $transaction->id,
        );
    }

    public function notifyDeliveryDelayed(Transaction $transaction, int $daysLate): void
    {
        $this->notifyStaff(
            'delivery_delayed',
            self::SEVERITY_MEDIUM,
            'Pengiriman terlambat',
            "Pengiriman {$transaction->transaction_code} terlambat {$daysLate} hari dari perkiraan.",
            'transaction',
            $transaction->id,
        );
    }

    /** Pengeluaran menunggu persetujuan. */
    public function notifyExpenseSubmitted(string $code, string $amount): void
    {
        $this->notifyStaff(
            'expense_submitted',
            self::SEVERITY_LOW,
            'Pengeluaran diajukan',
            "Pengeluaran {$code} sebesar {$this->rupiah($amount)} menunggu persetujuan.",
            'expense',
            null,
        );
    }

    /** Pengadaan menunggu diproses. */
    public function notifyProcurementCreated(string $code, string $item): void
    {
        $this->notifyStaff(
            'procurement_created',
            self::SEVERITY_LOW,
            'Pengadaan dicatat',
            "Pengadaan {$code} — {$item} telah dicatat dan menunggu diproses.",
            'procurement',
            null,
        );
    }
}
