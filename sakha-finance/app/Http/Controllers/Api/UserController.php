<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function __construct(private readonly ActivityLogService $activity) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = User::query();

        if ($term = $request->string('q')->toString()) {
            $like = '%'.$term.'%';
            $query->where(fn ($q) => $q->where('name', \App\Support\Search::likeOperator(), $like)->orWhere('email', \App\Support\Search::likeOperator(), $like));
        }

        if ($role = $request->string('role')->toString()) {
            $query->where('role', $role);
        }

        $perPage = min((int) $request->integer('per_page', 20), 100);
        $paginated = $query->orderBy('name')->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $paginated->getCollection()->map(fn (User $u) => $this->payload($u)),
            'meta' => ['total' => $paginated->total(), 'current_page' => $paginated->currentPage(), 'last_page' => $paginated->lastPage()],
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['is_active'] = $data['is_active'] ?? true;

        $user = User::create($data);

        $this->activity->log('user', $user->id, 'user.created', "User {$user->name} created with role {$user->role->value}");

        return response()->json(['data' => $this->payload($user)], 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        if (empty($data['password'])) {
            unset($data['password']);
        }

        // Prevent removing the last active administrator.
        if ((isset($data['role']) && $data['role'] !== UserRole::ADMIN->value) || (isset($data['is_active']) && ! $data['is_active'])) {
            $activeAdmins = User::where('role', UserRole::ADMIN)->where('is_active', true)->where('id', '!=', $user->id)->count();
            if ($user->role === UserRole::ADMIN && $user->is_active && $activeAdmins === 0) {
                throw ValidationException::withMessages([
                    'role' => 'Administrator aktif terakhir tidak dapat dihapus.',
                ]);
            }
        }

        $before = $user->only(['name', 'email', 'role', 'is_active']);
        $user->update($data);

        $this->activity->log('user', $user->id, 'user.updated', "User {$user->name} updated", [
            'before' => $before,
            'after' => $user->only(['name', 'email', 'role', 'is_active']),
        ]);

        return response()->json(['data' => $this->payload($user->refresh())]);
    }

    private function authorizeAdmin(Request $request): void
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Hanya Administrator yang dapat mengelola pengguna.');
        }
    }

    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'is_active' => $user->is_active,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
