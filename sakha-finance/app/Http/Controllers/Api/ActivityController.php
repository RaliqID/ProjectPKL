<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::query()->with('user');

        if ($entityType = $request->string('entity_type')->toString()) {
            $query->where('entity_type', $entityType);
        }

        if ($entityId = $request->integer('entity_id')) {
            $query->where('entity_id', $entityId);
        }

        if ($userId = $request->integer('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($action = $request->string('action')->toString()) {
            $query->where('action', \App\Support\Search::likeOperator(), '%'.$action.'%');
        }

        // Free-text search over the human-readable description.
        if ($term = $request->string('q')->toString()) {
            $query->where('description', \App\Support\Search::likeOperator(), '%'.$term.'%');
        }

        if ($from = $request->string('date_from')->toString()) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->string('date_to')->toString()) {
            $query->whereDate('created_at', '<=', $to);
        }

        $perPage = min((int) $request->integer('per_page', 25), 100);
        $paginated = $query->latest()->paginate($perPage)->withQueryString();

        return ActivityLogResource::collection($paginated)->response();
    }
}
