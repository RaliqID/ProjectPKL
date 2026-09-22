<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_log_in_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'user@test.local',
            'password' => 'password123',
            'role' => UserRole::OPERATOR,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'user@test.local',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'user@test.local')
            ->assertJsonPath('user.role', 'OPERATOR');
        $this->assertAuthenticated();
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->create(['email' => 'user@test.local', 'password' => 'password123']);

        $response = $this->postJson('/api/login', [
            'email' => 'user@test.local',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertGuest();
    }

    public function test_deactivated_user_cannot_log_in(): void
    {
        User::factory()->create([
            'email' => 'inactive@test.local',
            'password' => 'password123',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'inactive@test.local',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
        $this->assertGuest();
    }

    public function test_guest_cannot_access_protected_endpoints(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
        $this->getJson('/api/overview')->assertUnauthorized();
        $this->getJson('/api/transactions')->assertUnauthorized();
    }

    public function test_authenticated_user_can_fetch_own_profile(): void
    {
        $user = User::factory()->create(['role' => UserRole::REVIEWER, 'is_active' => true]);

        $this->actingAs($user)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.role', 'REVIEWER')
            ->assertJsonPath('permissions.can_write_transactions', false)
            ->assertJsonPath('permissions.can_review_documents', true);
    }

    public function test_user_can_log_out(): void
    {
        $user = User::factory()->create(['is_active' => true]);

        $this->actingAs($user)->postJson('/api/logout')->assertOk();
    }

    public function test_user_can_register_and_is_signed_in(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'New Operator',
            'email' => 'new@test.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'OPERATOR',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', 'new@test.local')
            ->assertJsonPath('user.role', 'OPERATOR');

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['email' => 'new@test.local', 'role' => 'OPERATOR', 'is_active' => true]);
    }

    public function test_registration_defaults_to_operator_when_no_role_given(): void
    {
        $this->postJson('/api/register', [
            'name' => 'No Role',
            'email' => 'norole@test.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()->assertJsonPath('user.role', 'OPERATOR');
    }

    public function test_registration_cannot_self_assign_admin(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Sneaky',
            'email' => 'sneaky@test.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'ADMIN',
        ])->assertStatus(422)->assertJsonValidationErrors('role');

        $this->assertDatabaseMissing('users', ['email' => 'sneaky@test.local']);
    }

    public function test_registration_requires_matching_password_confirmation(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Mismatch',
            'email' => 'mismatch@test.local',
            'password' => 'password123',
            'password_confirmation' => 'different123',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_registration_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@test.local']);

        $this->postJson('/api/register', [
            'name' => 'Taken',
            'email' => 'taken@test.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }
}
