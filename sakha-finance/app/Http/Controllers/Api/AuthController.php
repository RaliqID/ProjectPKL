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
                'email' => 'Email atau kata sandi tidak sesuai.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => 'Akun ini dinonaktifkan. Hubungi administrator.',
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

        $this->activity->log('auth', $user->id, 'auth.login', "{$user->name} masuk ke sistem");

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

        return response()->json(['message' => 'Berhasil keluar.']);
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
            'role_description' => $user->role->description(),
            'is_active' => $user->is_active,
            'theme_preference' => $user->theme_preference,
            'email_notifications' => $user->email_notifications,
            'notification_types' => $user->notification_types,
        ];
    }

    /**
     * Update the signed-in user's own preferences (theme + notifications).
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'theme_preference' => ['sometimes', 'string', 'in:light,dark,system'],
            'email_notifications' => ['sometimes', 'boolean'],
            'notification_types' => ['sometimes', 'array'],
            'notification_types.*' => ['string', 'in:verification,document,payment,delivery,expense,procurement,report'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $update = [];
        if (array_key_exists('theme_preference', $validated)) {
            $update['theme_preference'] = $validated['theme_preference'];
        }
        if (array_key_exists('email_notifications', $validated)) {
            $update['email_notifications'] = $validated['email_notifications'];
        }
        if (array_key_exists('notification_types', $validated)) {
            $update['notification_types'] = $validated['notification_types'];
        }

        if (! empty($update)) {
            $user->forceFill($update)->save();
        }

        return response()->json([
            'message' => 'Preferensi disimpan.',
            'user' => $this->userPayload($user->fresh()),
        ]);
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
