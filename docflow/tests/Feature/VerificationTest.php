<?php

namespace Tests\Feature;

use App\Enums\DocumentStatus;
use App\Enums\DocumentType;
use App\Enums\InvoiceStatus;
use App\Enums\DeliveryStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\RequiredDocumentRule;
use App\Models\Transaction;
use App\Models\User;
use App\Services\VerificationService;
use App\Services\WorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VerificationTest extends TestCase
{
    use RefreshDatabase;

    private User $operator;
    private User $reviewer;
    private Customer $customer;
    private VerificationService $verification;
    private WorkflowService $workflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->operator = User::factory()->create(['role' => UserRole::OPERATOR, 'is_active' => true]);
        $this->reviewer = User::factory()->create(['role' => UserRole::REVIEWER, 'is_active' => true]);
        $this->customer = Customer::create([
            'customer_code' => 'CUST-0001',
            'name' => 'PT Test Customer',
            'status' => 'ACTIVE',
        ]);

        foreach ([DocumentType::INVOICE, DocumentType::DELIVERY_ORDER, DocumentType::PAYMENT_PROOF] as $type) {
            RequiredDocumentRule::create([
                'document_type' => $type->value,
                'is_required' => true,
                'is_active' => true,
            ]);
        }

        $this->verification = app(VerificationService::class);
        $this->workflow = app(WorkflowService::class);
    }

    private function healthyTransaction(int $total = 11_100_000): Transaction
    {
        $net = (int) round($total / 1.11);
        $tax = $total - $net;

        $transaction = Transaction::create([
            'transaction_code' => 'TRX-2026-'.str_pad((string) random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
            'customer_id' => $this->customer->id,
            'transaction_date' => '2026-05-01',
            'status' => TransactionStatus::DELIVERED,
            'subtotal' => $total,
            'total_amount' => $total,
            'created_by' => $this->operator->id,
        ]);

        $invoice = Invoice::create([
            'transaction_id' => $transaction->id,
            'invoice_number' => 'INV-2026-00001',
            'invoice_date' => '2026-05-02',
            'due_date' => '2026-06-01',
            'amount' => $net,
            'tax_amount' => $tax,
            'status' => InvoiceStatus::PAID,
            'created_by' => $this->operator->id,
        ]);

        Payment::create([
            'transaction_id' => $transaction->id,
            'invoice_id' => $invoice->id,
            'payment_reference' => 'PAY-1',
            'payment_date' => '2026-05-10',
            'amount' => $total,
            'method' => 'BANK_TRANSFER',
            'status' => PaymentStatus::CONFIRMED,
            'created_by' => $this->operator->id,
        ]);

        Delivery::create([
            'transaction_id' => $transaction->id,
            'delivery_number' => 'DO-1',
            'courier' => 'JNE',
            'tracking_number' => 'JNE123456789',
            'shipping_date' => '2026-05-03',
            'estimated_delivery_date' => '2026-05-06',
            'delivered_at' => '2026-05-06 10:00:00',
            'status' => DeliveryStatus::DELIVERED,
            'recipient_name' => 'PT Test Customer',
        ]);

        foreach ([DocumentType::INVOICE, DocumentType::DELIVERY_ORDER, DocumentType::PAYMENT_PROOF] as $type) {
            $path = 'transactions/'.$transaction->transaction_code.'/'.strtolower($type->value).'.pdf';
            // Write a real file so the document-file-validity rule passes.
            Storage::disk('local')->put($path, '%PDF-1.4 demo');

            Document::create([
                'transaction_id' => $transaction->id,
                'document_type' => $type->value,
                'original_filename' => strtolower($type->value).'.pdf',
                'stored_filename' => strtolower($type->value).'.pdf',
                'file_path' => $path,
                'mime_type' => 'application/pdf',
                'file_size' => 512,
                'document_number' => $type === DocumentType::INVOICE ? 'INV-2026-00001' : null,
                'uploaded_by' => $this->operator->id,
                'status' => DocumentStatus::VERIFIED,
                'current_version' => 1,
            ]);
        }

        return $transaction->refresh();
    }

    public function test_healthy_transaction_passes_verification(): void
    {
        $transaction = $this->healthyTransaction();

        $run = $this->verification->run($transaction, $this->operator);

        $this->assertSame('PASS', $run->overall_status);
        $this->assertSame(0, $run->failed_count);
        $this->assertSame(100, $run->score);
        $this->assertGreaterThanOrEqual(8, $run->checks->count());
    }

    public function test_missing_required_document_fails_verification(): void
    {
        $transaction = $this->healthyTransaction();
        // Remove the payment proof document.
        $transaction->documents()->where('document_type', DocumentType::PAYMENT_PROOF->value)->delete();

        $run = $this->verification->run($transaction->refresh(), $this->operator);

        $this->assertSame('FAILED', $run->overall_status);
        $check = $run->checks->firstWhere('rule_key', 'required_documents');
        $this->assertSame('FAILED', $check->status->value);
        $this->assertContains('PAYMENT_PROOF', $check->metadata['missing']);
    }

    public function test_invoice_amount_mismatch_fails_verification(): void
    {
        $transaction = $this->healthyTransaction();
        $transaction->invoices()->first()->update(['amount' => 999]);

        $run = $this->verification->run($transaction->refresh(), $this->operator);

        $check = $run->checks->firstWhere('rule_key', 'invoice_amount');
        $this->assertSame('FAILED', $check->status->value);
        $this->assertArrayHasKey('difference', $check->metadata);
    }

    public function test_partial_payment_produces_warning_not_failure(): void
    {
        $transaction = $this->healthyTransaction();
        $transaction->payments()->delete();
        Payment::create([
            'transaction_id' => $transaction->id,
            'payment_date' => '2026-05-10',
            'amount' => 4_000_000,
            'method' => 'BANK_TRANSFER',
            'status' => PaymentStatus::CONFIRMED,
            'created_by' => $this->operator->id,
        ]);

        $run = $this->verification->run($transaction->refresh(), $this->operator);

        $check = $run->checks->firstWhere('rule_key', 'payment_balance');
        $this->assertSame('WARNING', $check->status->value);
    }

    public function test_duplicate_document_number_produces_warning(): void
    {
        $transaction = $this->healthyTransaction();
        // Add a second invoice doc with the same number.
        Document::create([
            'transaction_id' => $transaction->id,
            'document_type' => DocumentType::INVOICE->value,
            'original_filename' => 'dup.pdf',
            'stored_filename' => 'dup.pdf',
            'file_path' => 'transactions/x/dup.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'document_number' => 'INV-2026-00001',
            'uploaded_by' => $this->operator->id,
            'status' => DocumentStatus::UPLOADED,
            'current_version' => 1,
        ]);

        $run = $this->verification->run($transaction->refresh(), $this->operator);

        $check = $run->checks->firstWhere('rule_key', 'duplicate_document');
        $this->assertSame('WARNING', $check->status->value);
    }

    public function test_failed_verification_moves_transaction_to_needs_review(): void
    {
        $transaction = $this->healthyTransaction();
        $transaction->documents()->where('document_type', DocumentType::PAYMENT_PROOF->value)->delete();
        $transaction->forceFill(['status' => TransactionStatus::DELIVERED])->save();

        $this->verification->run($transaction->refresh(), $this->operator);

        $this->assertSame(TransactionStatus::NEEDS_REVIEW, $transaction->fresh()->status);
    }

    public function test_workflow_blocks_completion_when_conditions_unmet(): void
    {
        $transaction = $this->healthyTransaction();
        $transaction->documents()->where('document_type', DocumentType::PAYMENT_PROOF->value)->delete();

        $gate = $this->workflow->canCompleteTransaction($transaction->refresh());

        $this->assertFalse($gate['allowed']);
        $this->assertNotEmpty($gate['reasons']);
    }

    public function test_workflow_allows_completion_when_everything_satisfied(): void
    {
        $transaction = $this->healthyTransaction();

        // Ensure latest verification is a clean pass first.
        $this->verification->run($transaction, $this->operator);

        $gate = $this->workflow->canCompleteTransaction($transaction->refresh());

        $this->assertTrue($gate['allowed'], 'Expected completion to be allowed. Reasons: '.implode('; ', $gate['reasons']));
    }

    public function test_completing_transaction_writes_activity_log(): void
    {
        $transaction = $this->healthyTransaction();
        $this->verification->run($transaction, $this->operator);

        $this->actingAs($this->operator)
            ->postJson("/api/transactions/{$transaction->id}/complete")
            ->assertOk();

        $this->assertSame(TransactionStatus::COMPLETED, $transaction->fresh()->status);
        $this->assertDatabaseHas('activity_logs', [
            'entity_type' => 'transaction',
            'entity_id' => $transaction->id,
            'action' => 'transaction.completed',
        ]);
    }

    public function test_verification_run_is_persisted_with_checks(): void
    {
        $transaction = $this->healthyTransaction();

        $this->actingAs($this->operator)
            ->postJson("/api/transactions/{$transaction->id}/verification/run")
            ->assertOk()
            ->assertJsonPath('data.overall_status', 'PASS');

        $this->assertDatabaseCount('verification_runs', 1);
        $this->assertGreaterThanOrEqual(8, \App\Models\VerificationCheck::count());
    }
}
