<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = AppNotification::query()
            ->where(fn ($q) => $q->where('user_id', $user->id)->orWhereNull('user_id'));

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        $perPage = min((int) $request->integer('per_page', 20), 100);
        $paginated = $query->latest()->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $paginated->getCollection()->map(fn (AppNotification $n) => $this->payload($n)),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'unread_count' => $this->countUnread($user->id),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['data' => ['count' => $this->countUnread($request->user()->id)]]);
    }

    public function markRead(Request $request, AppNotification $notification): JsonResponse
    {
        $notification->markAsRead();

        return response()->json(['data' => $this->payload($notification->refresh())]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        AppNotification::query()
            ->where(fn ($q) => $q->where('user_id', $request->user()->id)->orWhereNull('user_id'))
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Semua notifikasi ditandai sudah dibaca.']);
    }

    private function countUnread(int $userId): int
    {
        return AppNotification::query()
            ->where(fn ($q) => $q->where('user_id', $userId)->orWhereNull('user_id'))
            ->whereNull('read_at')
            ->count();
    }

    private function payload(AppNotification $n): array
    {
        return [
            'id' => $n->id,
            'type' => $n->type,
            'severity' => $n->severity,
            'title' => $n->title,
            'message' => $n->message,
            'entity_type' => $n->entity_type,
            'entity_id' => $n->entity_id,
            'read_at' => $n->read_at?->toIso8601String(),
            'is_unread' => $n->isUnread(),
            'created_at' => $n->created_at?->toIso8601String(),
        ];
    }
}
