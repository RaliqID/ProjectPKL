<?php

namespace Tests\Feature;

use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionTest extends TestCase
{
    use RefreshDatabase;

    private function operator(): User
    {
        return User::factory()->create(['role' => UserRole::OPERATOR, 'is_active' => true]);
    }

    private function customer(): Customer
    {
        return Customer::create([
            'customer_code' => 'CUST-0001',
            'name' => 'PT Test Customer',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_operator_can_create_transaction_and_total_is_recalculated_server_side(): void
    {
        $operator = $this->operator();
        $customer = $this->customer();

        // Client sends an intentionally wrong total (fields only; server must compute).
        $response = $this->actingAs($operator)->postJson('/api/transactions', [
            'customer_id' => $customer->id,
            'transaction_date' => '2026-05-01',
            'subtotal' => 10_000_000,
            'discount' => 1_000_000,
            'tax' => 990_000,
        ]);

        $response->assertCreated();

        $transaction = Transaction::firstOrFail();
        // 10,000,000 - 1,000,000 + 990,000 = 9,990,000
        $this->assertSame('9990000.00', $transaction->total_amount);
        $this->assertSame(TransactionStatus::DRAFT, $transaction->status);
        $this->assertMatchesRegularExpression('/^TRX-\d{4}-\d{5}$/', $transaction->transaction_code);
    }

    public function test_valid_status_transition_is_allowed(): void
    {
        $operator = $this->operator();
        $transaction = Transaction::create([
            'transaction_code' => 'TRX-2026-00001',
            'customer_id' => $this->customer()->id,
            'transaction_date' => '2026-05-01',
            'status' => TransactionStatus::DRAFT,
            'subtotal' => 1000,
            'total_amount' => 1000,
            'created_by' => $operator->id,
        ]);

        $response = $this->actingAs($operator)->postJson("/api/transactions/{$transaction->id}/status", [
            'status' => 'PROCESSING',
        ]);

        $response->assertOk();
        $this->assertSame(TransactionStatus::PROCESSING, $transaction->fresh()->status);
    }

    public function test_invalid_status_transition_is_rejected(): void
    {
        $operator = $this->operator();
        $transaction = Transaction::create([
            'transaction_code' => 'TRX-2026-00002',
            'customer_id' => $this->customer()->id,
            'transaction_date' => '2026-05-01',
            'status' => TransactionStatus::DRAFT,
            'subtotal' => 1000,
            'total_amount' => 1000,
            'created_by' => $operator->id,
        ]);

        // DRAFT cannot go straight to DELIVERED.
        $response = $this->actingAs($operator)->postJson("/api/transactions/{$transaction->id}/status", [
            'status' => 'DELIVERED',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('status');
        $this->assertSame(TransactionStatus::DRAFT, $transaction->fresh()->status);
    }

    public function test_non_admin_cannot_override_workflow_transition(): void
    {
        $operator = $this->operator();
        $transaction = Transaction::create([
            'transaction_code' => 'TRX-2026-00003',
            'customer_id' => $this->customer()->id,
            'transaction_date' => '2026-05-01',
            'status' => TransactionStatus::DRAFT,
            'subtotal' => 1000,
            'total_amount' => 1000,
            'created_by' => $operator->id,
        ]);

        $this->actingAs($operator)->postJson("/api/transactions/{$transaction->id}/status", [
            'status' => 'DELIVERED',
            'override' => true,
            'reason' => 'manual',
        ])->assertStatus(422);
    }

    public function test_admin_can_override_with_reason(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]);
        $transaction = Transaction::create([
            'transaction_code' => 'TRX-2026-00004',
            'customer_id' => $this->customer()->id,
            'transaction_date' => '2026-05-01',
            'status' => TransactionStatus::DRAFT,
            'subtotal' => 1000,
            'total_amount' => 1000,
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)->postJson("/api/transactions/{$transaction->id}/status", [
            'status' => 'DELIVERED',
            'override' => true,
            'reason' => 'Data migration correction',
        ])->assertOk();

        $this->assertSame(TransactionStatus::DELIVERED, $transaction->fresh()->status);
    }

    public function test_transaction_listing_supports_search_and_filters(): void
    {
        $operator = $this->operator();
        $customer = $this->customer();

        foreach (['TRX-2026-00010', 'TRX-2026-00011'] as $i => $code) {
            Transaction::create([
                'transaction_code' => $code,
                'customer_id' => $customer->id,
                'transaction_date' => '2026-05-0'.($i + 1),
                'status' => $i === 0 ? TransactionStatus::COMPLETED : TransactionStatus::DRAFT,
                'subtotal' => 1000,
                'total_amount' => 1000,
                'created_by' => $operator->id,
            ]);
        }

        $this->actingAs($operator)
            ->getJson('/api/transactions?status=COMPLETED')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.transaction_code', 'TRX-2026-00010');

        $this->actingAs($operator)
            ->getJson('/api/transactions?q=TRX-2026-00011')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_transaction_detail_returns_workflow_gate(): void
    {
        $operator = $this->operator();
        $transaction = Transaction::create([
            'transaction_code' => 'TRX-2026-00020',
            'customer_id' => $this->customer()->id,
            'transaction_date' => '2026-05-01',
            'status' => TransactionStatus::DRAFT,
            'subtotal' => 1000,
            'total_amount' => 1000,
            'created_by' => $operator->id,
        ]);

        $this->actingAs($operator)
            ->getJson("/api/transactions/{$transaction->id}")
            ->assertOk()
            ->assertJsonPath('data.workflow.can_complete.allowed', false)
            ->assertJsonStructure(['data' => ['workflow' => ['can_complete' => ['reasons']]]]);
    }
}
