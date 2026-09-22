<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function __construct(
        private readonly ActivityLogService $activity,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * Record a payment against a transaction (and optionally a specific invoice).
     * Rejects amounts that exceed the outstanding balance (no unexplained overpayment).
     */
    public function record(Transaction $transaction, User $actor, array $data): Payment
    {
        $amount = bcadd((string) $data['amount'], '0', 2);

        if (bccomp($amount, '0', 2) <= 0) {
            throw ValidationException::withMessages(['amount' => 'Payment amount must be greater than zero.']);
        }

        $invoice = isset($data['invoice_id'])
            ? $transaction->invoices()->find($data['invoice_id'])
            : $transaction->invoices()->first();

        // Determine the ceiling: invoice remaining if an invoice exists, else transaction outstanding.
        if ($invoice) {
            $ceiling = $invoice->remainingAmount();
            $ceilingLabel = "invoice {$invoice->invoice_number}";
        } else {
            $ceiling = $transaction->outstandingAmount();
            $ceilingLabel = 'transaction outstanding balance';
        }

        if (bccomp($amount, $ceiling, 2) > 0) {
            $diff = bcsub($amount, $ceiling, 2);

            throw ValidationException::withMessages([
                'amount' => 'Payment amount (Rp '.$this->format($amount).') exceeds the '.$ceilingLabel.
                    ' (Rp '.$this->format($ceiling).'). Difference: +Rp '.$this->format($diff).'.',
            ]);
        }

        $payment = DB::transaction(function () use ($transaction, $actor, $data, $amount, $invoice) {
            $payment = Payment::create([
                'transaction_id' => $transaction->id,
                'invoice_id' => $invoice?->id,
                'payment_reference' => $data['payment_reference'] ?? null,
                'payment_date' => $data['payment_date'],
                'amount' => $amount,
                'method' => $data['method'] ?? PaymentMethod::BANK_TRANSFER,
                'status' => $data['status'] ?? PaymentStatus::PENDING,
                'notes' => $data['notes'] ?? null,
                'created_by' => $actor->id,
            ]);

            $this->syncInvoiceStatus($payment);

            // If the payment was recorded already CONFIRMED, the transaction's
            // paid state must advance immediately (not only on a later confirm).
            if ($payment->status === PaymentStatus::CONFIRMED) {
                $this->syncTransactionStatus($payment->transaction);
            }

            return $payment;
        });

        $this->activity->logTransaction(
            $transaction->id,
            'payment.recorded',
            'Payment of Rp '.$this->format($amount).' recorded',
            [
                'payment_id' => $payment->id,
                'amount' => $amount,
                'method' => $payment->method->value,
                'status' => $payment->status->value,
            ],
        );

        return $payment->refresh();
    }

    public function confirm(Payment $payment, User $actor): Payment
    {
        $before = ['status' => $payment->status->value, 'amount' => (string) $payment->amount];

        $payment->forceFill(['status' => PaymentStatus::CONFIRMED])->save();

        DB::transaction(function () use ($payment) {
            $this->syncInvoiceStatus($payment);
            $this->syncTransactionStatus($payment->transaction);
        });

        $this->activity->logTransaction(
            $payment->transaction_id,
            'payment.confirmed',
            'Payment of Rp '.$this->format((string) $payment->amount).' confirmed',
            ['before' => $before, 'after' => ['status' => 'CONFIRMED']],
        );

        return $payment->refresh();
    }

    public function reject(Payment $payment, User $actor, ?string $reason = null): Payment
    {
        $payment->forceFill(['status' => PaymentStatus::REJECTED])->save();

        DB::transaction(function () use ($payment) {
            $this->syncInvoiceStatus($payment);
        });

        $this->activity->logTransaction(
            $payment->transaction_id,
            'payment.rejected',
            'Payment of Rp '.$this->format((string) $payment->amount).' rejected',
            ['reason' => $reason],
        );

        return $payment->refresh();
    }

    /**
     * Recalculate and persist the invoice status based on confirmed payments.
     */
    public function syncInvoiceStatus(Payment $payment): void
    {
        $invoice = $payment->invoice;
        if (! $invoice) {
            return;
        }

        $invoice->load('payments');
        $paid = $invoice->confirmedPaidAmount();

        $status = match (true) {
            bccomp($paid, '0', 2) === 0 => $invoice->isOverdue() ? InvoiceStatus::OVERDUE : InvoiceStatus::ISSUED,
            bccomp($paid, $invoice->totalAmount(), 2) >= 0 => InvoiceStatus::PAID,
            default => InvoiceStatus::PARTIALLY_PAID,
        };

        $invoice->forceFill(['status' => $status])->save();
    }

    /**
     * Move transaction to PAID / AWAITING_PAYMENT once payments change.
     * Only nudges when the transaction is in a payment-relevant state.
     */
    public function syncTransactionStatus(?Transaction $transaction): void
    {
        if (! $transaction) {
            return;
        }

        $transaction->load('payments', 'invoices');
        $current = $transaction->status;
        $paymentStates = [
            \App\Enums\TransactionStatus::AWAITING_PAYMENT,
            \App\Enums\TransactionStatus::PAID,
            \App\Enums\TransactionStatus::PROCESSING,
        ];

        if (! in_array($current, $paymentStates, true)) {
            return;
        }

        if ($transaction->isFullyPaid()) {
            $transaction->forceFill(['status' => \App\Enums\TransactionStatus::PAID])->save();
        } elseif (bccomp($transaction->confirmedPaidAmount(), '0', 2) === 0 && $current === \App\Enums\TransactionStatus::PAID) {
            $transaction->forceFill(['status' => \App\Enums\TransactionStatus::AWAITING_PAYMENT])->save();
        }
    }

    public function format(string $amount): string
    {
        return number_format((float) $amount, 0, ',', '.');
    }
}
