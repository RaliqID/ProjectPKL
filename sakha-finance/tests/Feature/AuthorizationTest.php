<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_operator_cannot_list_users(): void
    {
        $operator = User::factory()->create(['role' => UserRole::OPERATOR, 'is_active' => true]);

        $this->actingAs($operator)->getJson('/api/users')->assertForbidden();
    }

    public function test_admin_can_list_users(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]);

        $this->actingAs($admin)->getJson('/api/users')->assertOk();
    }

    public function test_operator_cannot_manage_settings(): void
    {
        $operator = User::factory()->create(['role' => UserRole::OPERATOR, 'is_active' => true]);

        $this->actingAs($operator)->getJson('/api/settings')->assertForbidden();
    }

    public function test_admin_can_manage_settings(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]);

        $this->actingAs($admin)->getJson('/api/settings')->assertOk();
    }

    public function test_reviewer_cannot_create_transactions(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::REVIEWER, 'is_active' => true]);

        $this->actingAs($reviewer)->postJson('/api/transactions', [])->assertForbidden();
    }

    public function test_operator_can_run_verification_but_reviewer_permissions_differ(): void
    {
        $operator = User::factory()->create(['role' => UserRole::OPERATOR, 'is_active' => true]);
        $reviewer = User::factory()->create(['role' => UserRole::REVIEWER, 'is_active' => true]);

        $this->assertTrue($operator->canWrite());
        $this->assertFalse($reviewer->canWrite());
        $this->assertTrue($reviewer->isReviewer());
        $this->assertTrue($operator->isOperator());
    }

    public function test_deactivated_user_is_blocked_by_active_middleware(): void
    {
        $user = User::factory()->create(['role' => UserRole::OPERATOR, 'is_active' => false]);

        $this->actingAs($user)->getJson('/api/me')->assertForbidden();
    }
}
