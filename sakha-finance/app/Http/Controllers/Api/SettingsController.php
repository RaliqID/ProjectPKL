<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentType;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\RequiredDocumentRule;
use App\Models\SystemSetting;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function __construct(private readonly ActivityLogService $activity) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $rules = RequiredDocumentRule::query()->get()->map(fn (RequiredDocumentRule $r) => [
            'id' => $r->id,
            'document_type' => $r->document_type->value,
            'document_type_label' => $r->document_type->label(),
            'is_required' => $r->is_required,
            'is_active' => $r->is_active,
            'description' => $r->description,
        ]);

        return response()->json([
            'data' => [
                'required_documents' => $rules,
                'available_document_types' => collect(DocumentType::cases())->map(fn ($t) => [
                    'value' => $t->value,
                    'label' => $t->label(),
                ]),
                'system' => [
                    'app_name' => config('app.name'),
                    'timezone' => config('app.timezone'),
                    'max_upload_mb' => (int) (\App\Services\DocumentService::MAX_FILE_SIZE / 1024 / 1024),
                    'allowed_file_types' => \App\Services\DocumentService::ALLOWED_EXTENSIONS,
                    'session_lifetime' => (int) config('session.lifetime'),
                ],
                'verification' => [
                    'auto_review_threshold' => (int) SystemSetting::get('verification_auto_review_threshold', 1),
                    'min_score' => (int) SystemSetting::get('verification_min_score', 70),
                ],
                'roles' => collect(UserRole::cases())->map(fn ($r) => [
                    'value' => $r->value,
                    'label' => $r->label(),
                    'description' => $r->description(),
                ]),
            ],
        ]);
    }

    /**
     * Update verification thresholds.
     *
     * - auto_review_threshold: how many failed checks force a transaction into
     *   NEEDS_REVIEW.
     * - min_score: the minimum verification score considered acceptable; a run
     *   below this is treated as a warning even with no hard failures.
     */
    public function updateVerification(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'auto_review_threshold' => ['required', 'integer', 'min:0', 'max:20'],
            'min_score' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        SystemSetting::put('verification_auto_review_threshold', $validated['auto_review_threshold'], 'int', 'Failed checks that force NEEDS_REVIEW');
        SystemSetting::put('verification_min_score', $validated['min_score'], 'int', 'Minimum acceptable verification score');

        $this->activity->log(
            'settings',
            null,
            'settings.verification_updated',
            'Ambang verifikasi diperbarui',
            $validated,
        );

        return response()->json(['message' => 'Ambang verifikasi berhasil diperbarui.']);
    }

    public function updateRequiredDocuments(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'rules' => ['required', 'array'],
            'rules.*.document_type' => ['required', Rule::enum(DocumentType::class)],
            'rules.*.is_required' => ['required', 'boolean'],
            'rules.*.is_active' => ['required', 'boolean'],
        ]);

        $changes = [];

        foreach ($validated['rules'] as $rule) {
            $model = RequiredDocumentRule::query()->updateOrCreate(
                ['document_type' => $rule['document_type']],
                ['is_required' => $rule['is_required'], 'is_active' => $rule['is_active']],
            );
            $changes[$model->document_type->value] = ['required' => $model->is_required, 'active' => $model->is_active];
        }

        $this->activity->log('settings', null, 'settings.required_documents_updated', 'Aturan dokumen wajib diperbarui', ['rules' => $changes]);

        return response()->json(['message' => 'Aturan dokumen wajib berhasil diperbarui.']);
    }

    private function authorizeAdmin(Request $request): void
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Hanya Administrator yang dapat mengelola pengaturan.');
        }
    }
}
