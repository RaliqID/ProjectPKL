<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentStatus;
use App\Enums\DocumentType;
use App\Http\Controllers\Controller;
use App\Http\Resources\ArchiveResource;
use App\Models\Archive;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Arsip — digital archive of Finance documents.
 *
 * Supports the retrieval flow: search, filter by year/month/type/customer,
 * and a grouped view (Tahun → Bulan → Jenis) that mirrors how physical filing
 * is organised.
 */
class ArsipController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Archive::query()
            ->with(['customer', 'document', 'transaction'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($w) use ($term) {
                    $w->where('document_name', \App\Support\Search::likeOperator(), $term)
                        ->orWhere('document_number', \App\Support\Search::likeOperator(), $term)
                        ->orWhere('archive_code', \App\Support\Search::likeOperator(), $term)
                        ->orWhere('file_name', \App\Support\Search::likeOperator(), $term)
                        ->orWhereHas('customer', fn ($c) => $c->where('name', \App\Support\Search::likeOperator(), $term));
                });
            })
            ->when($request->filled('document_type'), fn ($q) => $q->where('document_type', $request->string('document_type')))
            ->when($request->filled('year'), fn ($q) => $q->where('period_year', (int) $request->input('year')))
            ->when($request->filled('month'), fn ($q) => $q->where('period_month', (int) $request->input('month')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('customer_id'), fn ($q) => $q->where('customer_id', $request->integer('customer_id')))
            ->latest('document_date')
            ->latest('id');

        $perPage = min((int) $request->integer('per_page', 20), 100);
        $paginated = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => ArchiveResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'facets' => $this->facets(),
        ]);
    }

    /** Grouped tree: Tahun → Bulan → Jenis → jumlah dokumen. */
    public function tree(): JsonResponse
    {
        $rows = Archive::query()
            ->selectRaw('period_year, period_month, document_type, count(*) as total')
            ->groupBy('period_year', 'period_month', 'document_type')
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->get();

        $tree = [];

        foreach ($rows as $row) {
            $year = (int) $row->period_year;
            $month = (int) $row->period_month;
            $type = $row->document_type instanceof DocumentType ? $row->document_type->value : (string) $row->document_type;

            $tree[$year] ??= ['year' => $year, 'total' => 0, 'months' => []];
            $tree[$year]['months'][$month] ??= ['month' => $month, 'total' => 0, 'types' => []];
            $tree[$year]['months'][$month]['types'][] = [
                'type' => $type,
                'label' => DocumentType::from($type)->label(),
                'total' => (int) $row->total,
            ];

            $tree[$year]['total'] += (int) $row->total;
            $tree[$year]['months'][$month]['total'] += (int) $row->total;
        }

        // Normalise nested maps into arrays for JSON.
        $out = array_map(function ($year) {
            $year['months'] = array_values($year['months']);

            return $year;
        }, array_values($tree));

        return response()->json(['data' => $out]);
    }

    public function show(Archive $archive): JsonResponse
    {
        $archive->load(['customer', 'document', 'transaction', 'archiver']);

        return response()->json(['data' => new ArchiveResource($archive)]);
    }

    /** Create an archive entry, optionally from an existing document. */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'document_type' => ['required', 'string', 'in:'.implode(',', DocumentType::values())],
            'document_name' => ['required', 'string', 'max:255'],
            'document_number' => ['nullable', 'string', 'max:80'],
            'file_name' => ['nullable', 'string', 'max:255'],
            'document_date' => ['nullable', 'date'],
            'archive_location' => ['nullable', 'string', 'max:120'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'transaction_id' => ['nullable', 'integer', 'exists:transactions,id'],
            'document_id' => ['nullable', 'integer', 'exists:documents,id'],
            'notes' => ['nullable', 'string'],
        ]);

        $date = isset($validated['document_date']) ? \Illuminate\Support\Carbon::parse($validated['document_date']) : now();

        $archive = Archive::create([
            ...$validated,
            'archive_code' => $this->nextCode(),
            'period_year' => (int) $date->format('Y'),
            'period_month' => (int) $date->format('n'),
            'status' => 'STORED',
            'archived_by' => $request->user()?->id,
        ]);

        app(\App\Services\ActivityLogService::class)->log(
            'archive',
            $archive->id,
            'archive.created',
            "Dokumen diarsipkan: {$archive->document_name}",
            ['archive_code' => $archive->archive_code],
        );

        return response()->json(['data' => new ArchiveResource($archive->load(['customer', 'document']))], 201);
    }

    /** Archive an existing document (mark it archived and store its coordinates). */
    public function archiveDocument(Request $request, \App\Models\Document $document): JsonResponse
    {
        $validated = $request->validate([
            'archive_location' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
        ]);

        $document->loadMissing('transaction.customer');

        $date = $document->created_at ?? now();

        $archive = Archive::firstOrCreate(
            ['document_id' => $document->id],
            [
                'archive_code' => $this->nextCode(),
                'transaction_id' => $document->transaction_id,
                'customer_id' => $document->transaction?->customer_id,
                'document_type' => $document->document_type,
                'document_name' => $document->original_filename,
                'document_number' => $document->document_number,
                'file_name' => $document->stored_filename,
                'document_date' => $date,
                'period_year' => (int) $date->format('Y'),
                'period_month' => (int) $date->format('n'),
                'archive_location' => $validated['archive_location'] ?? null,
                'status' => 'STORED',
                'archived_by' => $request->user()?->id,
                'notes' => $validated['notes'] ?? null,
            ],
        );

        $document->forceFill(['status' => DocumentStatus::ARCHIVED])->save();

        app(\App\Services\ActivityLogService::class)->log(
            'document',
            $document->id,
            'document.archived',
            "Dokumen diarsipkan: {$document->original_filename}",
            ['archive_code' => $archive->archive_code],
        );

        return response()->json(['data' => new ArchiveResource($archive->load(['customer', 'document']))], 201);
    }

    /**
     * Bulk-archive: file every verified document that is not yet in the archive.
     *
     * This models "Penyusunan Dokumen" — periodically moving completed, verified
     * documents into the archive rather than archiving them one at a time. Idempotent:
     * a document already archived is skipped.
     */
    public function sync(Request $request): JsonResponse
    {
        if ($request->user()?->role !== \App\Enums\UserRole::ADMIN) {
            abort(403, 'Hanya Administrator yang dapat menyusun arsip.');
        }

        $documents = \App\Models\Document::query()
            ->with('transaction.customer')
            ->where('status', DocumentStatus::VERIFIED)
            ->whereDoesntHave('archive')
            ->get();

        $created = 0;
        $seq = $this->nextSequence();

        foreach ($documents as $document) {
            $date = $document->created_at ?? now();

            Archive::create([
                'archive_code' => 'ARS-'.str_pad((string) $seq, 6, '0', STR_PAD_LEFT),
                'document_id' => $document->id,
                'transaction_id' => $document->transaction_id,
                'customer_id' => $document->transaction?->customer_id,
                'document_type' => $document->document_type,
                'document_name' => $document->original_filename,
                'document_number' => $document->document_number,
                'file_name' => $document->stored_filename,
                'document_date' => $date,
                'period_year' => (int) $date->format('Y'),
                'period_month' => (int) $date->format('n'),
                'archive_location' => 'Belum ditentukan',
                'status' => 'STORED',
                'archived_by' => $request->user()?->id,
            ]);

            $document->forceFill(['status' => DocumentStatus::ARCHIVED])->save();
            $seq++;
            $created++;
        }

        if ($created > 0) {
            app(\App\Services\ActivityLogService::class)->log(
                'archive',
                null,
                'archive.synced',
                "{$created} dokumen diverifikasi diarsipkan",
            );
        }

        return response()->json([
            'data' => ['archived' => $created],
            'message' => $created > 0
                ? "{$created} dokumen berhasil diarsipkan."
                : 'Semua dokumen terverifikasi sudah diarsipkan.',
        ]);
    }

    /**
     * @return array{types:array<int,array{value:string,label:string}>, years:array<int,int>}
     */
    private function facets(): array
    {
        return [
            'types' => array_map(
                fn (DocumentType $t) => ['value' => $t->value, 'label' => $t->label()],
                DocumentType::cases(),
            ),
            'years' => Archive::query()->distinct()->orderByDesc('period_year')->pluck('period_year')->map(fn ($y) => (int) $y)->all(),
        ];
    }

    private function nextSequence(): int
    {
        $last = Archive::withTrashed()->where('archive_code', 'like', 'ARS-%')->latest('id')->value('archive_code');

        return $last ? ((int) substr($last, 4)) + 1 : 1;
    }

    private function nextCode(): string
    {
        return 'ARS-'.str_pad((string) $this->nextSequence(), 6, '0', STR_PAD_LEFT);
    }
}
