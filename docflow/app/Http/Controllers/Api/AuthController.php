<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly ActivityLogService $activity) {}

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        /** @var User|null $user */
        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => 'This account has been deactivated. Contact an administrator.',
            ]);
        }

        if ($request->boolean('remember')) {
            Auth::guard('web')->login($user, true);
        } else {
            Auth::guard('web')->login($user);
        }

        // Rotate the session id on privilege change (standard practice) and write
        // it back on this response so the new cookie reaches the browser before
        // the SPA navigates. The SPA shell shares this same session.
        $request->session()->regenerate();

        $this->activity->log('auth', $user->id, 'auth.login', "{$user->name} signed in");

        return response()->json([
            'user' => $this->userPayload($user),
            'permissions' => $this->permissions($user),
        ]);
    }

    /**
     * Public self-registration. New accounts are created active and signed in
     * immediately. ADMIN cannot be self-assigned — only an existing admin can
     * grant it via the settings/users screen.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => isset($data['role']) ? UserRole::from($data['role']) : UserRole::OPERATOR,
            'is_active' => true,
        ]);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        $this->activity->log('auth', $user->id, 'auth.registered', "{$user->name} registered a new account");

        return response()->json([
            'user' => $this->userPayload($user),
            'permissions' => $this->permissions($user),
        ], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $this->activity->log('auth', $user->id, 'auth.logout', "{$user->name} signed out");
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'user' => $this->userPayload($user),
            'permissions' => $this->permissions($user),
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'is_active' => $user->is_active,
        ];
    }

    private function permissions(User $user): array
    {
        return [
            'can_write_transactions' => $user->canWrite(),
            'can_manage_users' => $user->isAdmin(),
            'can_manage_settings' => $user->isAdmin(),
            'can_review_documents' => $user->isAdmin() || $user->isReviewer(),
            'can_override_workflow' => $user->isAdmin(),
        ];
    }
}
