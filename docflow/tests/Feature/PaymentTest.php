<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $operator;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->operator = User::factory()->create(['role' => UserRole::OPERATOR, 'is_active' => true]);
        $this->customer = Customer::create([
            'customer_code' => 'CUST-0001',
            'name' => 'PT Test Customer',
            'status' => 'ACTIVE',
        ]);
    }

    private function makeTransaction(int $total = 10_000_000): Transaction
    {
        $transaction = Transaction::create([
            'transaction_code' => 'TRX-2026-'.str_pad((string) random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
            'customer_id' => $this->customer->id,
            'transaction_date' => '2026-05-01',
            'status' => TransactionStatus::AWAITING_PAYMENT,
            'subtotal' => $total,
            'total_amount' => $total,
            'created_by' => $this->operator->id,
        ]);

        Invoice::create([
            'transaction_id' => $transaction->id,
            'invoice_number' => 'INV-'.random_int(1000, 9999),
            'invoice_date' => '2026-05-02',
            'due_date' => '2026-06-01',
            'amount' => $total,
            'tax_amount' => 0,
            'status' => InvoiceStatus::ISSUED,
            'created_by' => $this->operator->id,
        ]);

        return $transaction->refresh();
    }

    public function test_partial_payments_accumulate_and_leave_outstanding_balance(): void
    {
        $transaction = $this->makeTransaction(10_000_000);

        $this->actingAs($this->operator)->postJson("/api/transactions/{$transaction->id}/payments", [
            'amount' => 4_000_000,
            'payment_date' => '2026-05-10',
            'method' => 'BANK_TRANSFER',
            'status' => 'CONFIRMED',
        ])->assertCreated();

        $this->actingAs($this->operator)->postJson("/api/transactions/{$transaction->id}/payments", [
            'amount' => 6_000_000,
            'payment_date' => '2026-05-20',
            'method' => 'BANK_TRANSFER',
            'status' => 'CONFIRMED',
        ])->assertCreated();

        $transaction->refresh()->load('payments', 'invoices');
        $this->assertSame('10000000.00', $transaction->confirmedPaidAmount());
        $this->assertSame('0.00', $transaction->outstandingAmount());
    }

    public function test_invoice_status_becomes_partially_paid_then_paid(): void
    {
        $transaction = $this->makeTransaction(10_000_000);
        $invoice = $transaction->invoices->first();

        $this->actingAs($this->operator)->postJson("/api/transactions/{$transaction->id}/payments", [
            'amount' => 3_000_000,
            'payment_date' => '2026-05-10',
            'status' => 'CONFIRMED',
        ])->assertCreated();

        $this->assertSame(InvoiceStatus::PARTIALLY_PAID, $invoice->fresh()->status);

        $this->actingAs($this->operator)->postJson("/api/transactions/{$transaction->id}/payments", [
            'amount' => 7_000_000,
            'payment_date' => '2026-05-20',
            'status' => 'CONFIRMED',
        ])->assertCreated();

        $this->assertSame(InvoiceStatus::PAID, $invoice->fresh()->status);
    }

    public function test_overpayment_beyond_outstanding_is_rejected(): void
    {
        $transaction = $this->makeTransaction(10_000_000);

        $response = $this->actingAs($this->operator)->postJson("/api/transactions/{$transaction->id}/payments", [
            'amount' => 12_000_000,
            'payment_date' => '2026-05-10',
            'status' => 'CONFIRMED',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('amount');
        $this->assertSame(0, Payment::count());
    }

    public function test_zero_or_negative_payment_is_rejected(): void
    {
        $transaction = $this->makeTransaction(10_000_000);

        $this->actingAs($this->operator)->postJson("/api/transactions/{$transaction->id}/payments", [
            'amount' => 0,
            'payment_date' => '2026-05-10',
        ])->assertStatus(422)->assertJsonValidationErrors('amount');
    }

    public function test_pending_payment_does_not_count_toward_settled_balance(): void
    {
        $transaction = $this->makeTransaction(10_000_000);

        $this->actingAs($this->operator)->postJson("/api/transactions/{$transaction->id}/payments", [
            'amount' => 10_000_000,
            'payment_date' => '2026-05-10',
            'status' => 'PENDING',
        ])->assertCreated();

        $transaction->refresh()->load('payments');
        $this->assertSame('0.00', $transaction->confirmedPaidAmount());
        $this->assertSame('10000000.00', $transaction->outstandingAmount());
    }

    public function test_payment_can_be_confirmed_then_transaction_becomes_paid(): void
    {
        $transaction = $this->makeTransaction(10_000_000);

        $payment = $this->actingAs($this->operator)->postJson("/api/transactions/{$transaction->id}/payments", [
            'amount' => 10_000_000,
            'payment_date' => '2026-05-10',
            'status' => 'PENDING',
        ])->assertCreated()->json('data');

        $this->actingAs($this->operator)->postJson("/api/payments/{$payment['id']}/confirm")->assertOk();

        $this->assertSame(PaymentStatus::CONFIRMED, Payment::find($payment['id'])->status);
        $this->assertSame(TransactionStatus::PAID, $transaction->fresh()->status);
    }

    /**
     * Regression: the payable ceiling must include the invoice tax. Previously a
     * full payment against an invoice with tax was wrongly rejected as overpayment.
     */
    public function test_full_payment_including_tax_is_accepted_and_marks_paid(): void
    {
        // Invoice with net 5,000,000 + tax 550,000 => payable 5,550,000.
        $transaction = Transaction::create([
            'transaction_code' => 'TRX-TAX-00001',
            'customer_id' => $this->customer->id,
            'transaction_date' => '2026-05-01',
            'status' => TransactionStatus::PROCESSING,
            'subtotal' => 5_000_000,
            'tax' => 550_000,
            'total_amount' => 5_550_000,
            'created_by' => $this->operator->id,
        ]);

        Invoice::create([
            'transaction_id' => $transaction->id,
            'invoice_number' => 'INV-TAX-1',
            'invoice_date' => '2026-05-02',
            'due_date' => '2026-06-01',
            'amount' => 5_000_000,
            'tax_amount' => 550_000,
            'status' => InvoiceStatus::ISSUED,
            'created_by' => $this->operator->id,
        ]);

        $this->actingAs($this->operator)->postJson("/api/transactions/{$transaction->id}/payments", [
            'amount' => 5_550_000,
            'payment_date' => '2026-05-10',
            'method' => 'BANK_TRANSFER',
            'status' => 'CONFIRMED',
        ])->assertCreated();

        $transaction->refresh()->load('payments', 'invoices');
        $this->assertSame('0.00', $transaction->outstandingAmount());
        $this->assertTrue($transaction->isFullyPaid());
        $this->assertSame(TransactionStatus::PAID, $transaction->status);
        $this->assertSame(InvoiceStatus::PAID, $transaction->invoices->first()->status);
    }
}
