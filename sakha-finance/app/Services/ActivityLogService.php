<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class ActivityLogService
{
    /**
     * Record an audit entry. Every important workflow action funnels through here.
     */
    public function log(
        string $entityType,
        ?int $entityId,
        string $action,
        string $description,
        array $metadata = [],
        ?User $user = null,
    ): ActivityLog {
        return ActivityLog::create([
            'user_id' => ($user ?? Auth::user())?->id,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'action' => $action,
            'description' => $description,
            'metadata' => $metadata ?: null,
        ]);
    }

    public function logTransaction(int $transactionId, string $action, string $description, array $metadata = []): ActivityLog
    {
        return $this->log('transaction', $transactionId, $action, $description, $metadata);
    }
}
