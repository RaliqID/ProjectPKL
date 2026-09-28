<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentStatus;
use App\Enums\DocumentType;
use App\Http\Controllers\Controller;
use App\Http\Requests\RejectDocumentRequest;
use App\Http\Requests\UploadDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use App\Models\Transaction;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function __construct(private readonly DocumentService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = Document::query()->with(['transaction.customer', 'uploader']);

        if ($type = $request->string('document_type')->toString()) {
            $query->where('document_type', $type);
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($from = $request->string('date_from')->toString()) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->string('date_to')->toString()) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($uploader = $request->integer('uploaded_by')) {
            $query->where('uploaded_by', $uploader);
        }

        if ($term = $request->string('q')->toString()) {
            $like = '%'.$term.'%';
            $query->where(function ($q) use ($like) {
                $q->where('original_filename', 'ilike', $like)
                    ->orWhere('document_number', 'ilike', $like)
                    ->orWhereHas('transaction', fn ($t) => $t->where('transaction_code', 'ilike', $like));
            });
        }

        $perPage = min((int) $request->integer('per_page', 15), 100);
        $paginated = $query->orderByDesc('id')->paginate($perPage)->withQueryString();

        return DocumentResource::collection($paginated)->response();
    }

    public function store(UploadDocumentRequest $request, Transaction $transaction): JsonResponse
    {
        $document = $this->service->store(
            $transaction,
            $request->user(),
            $request->file('file'),
            DocumentType::from($request->validated('document_type')),
            $request->validated('document_number'),
        );

        return response()->json(['data' => new DocumentResource($document->load('uploader', 'versions'))], 201);
    }

    public function show(Document $document): JsonResponse
    {
        $document->load(['transaction.customer', 'uploader', 'versions.uploader']);

        return response()->json(['data' => new DocumentResource($document)]);
    }

    public function addVersion(Request $request, Document $document): JsonResponse
    {
        if (! $request->user()->canWrite()) {
            abort(403, 'Anda tidak berwenang mengunggah versi dokumen.');
        }

        $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp'],
            'change_note' => ['nullable', 'string', 'max:500'],
        ]);

        $updated = $this->service->addVersion(
            $document,
            $request->user(),
            $request->file('file'),
            $request->input('change_note'),
        );

        return response()->json(['data' => new DocumentResource($updated->load('uploader', 'versions'))]);
    }

    public function verify(Request $request, Document $document): JsonResponse
    {
        if (! $request->user()->isReviewer() && ! $request->user()->isAdmin()) {
            abort(403, 'Hanya Pemeriksa dan Administrator yang dapat memverifikasi dokumen.');
        }

        $verified = $this->service->verify($document, $request->user());

        return response()->json(['data' => new DocumentResource($verified)]);
    }

    public function reject(RejectDocumentRequest $request, Document $document): JsonResponse
    {
        if (! $request->user()->isReviewer() && ! $request->user()->isAdmin()) {
            abort(403, 'Hanya Pemeriksa dan Administrator yang dapat menolak dokumen.');
        }

        $rejected = $this->service->reject($document, $request->user(), $request->validated('reason'));

        return response()->json(['data' => new DocumentResource($rejected)]);
    }

    public function archive(Request $request, Document $document): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Hanya Administrator yang dapat mengarsipkan dokumen.');
        }

        $archived = $this->service->archive($document, $request->user());

        return response()->json(['data' => new DocumentResource($archived)]);
    }

    /**
     * Stream a document for inline preview. Authorization is enforced here,
     * never trusting frontend privileges. Storage path is never exposed.
     *
     * Browsers' built-in PDF viewers issue byte-range requests, so we answer
     * them here. Without range support Chrome falls back to "Failed to load
     * PDF document" even when the file itself is valid.
     */
    public function preview(Request $request, Document $document): StreamedResponse
    {
        return $this->stream($document, 'inline', $request);
    }

    public function download(Request $request, Document $document): StreamedResponse
    {
        return $this->stream($document, 'attachment', $request);
    }

    private function stream(Document $document, string $disposition, Request $request): StreamedResponse
    {
        $disk = Storage::disk('local');

        if (! $disk->exists($document->file_path)) {
            abort(404, 'Berkas dokumen tidak ditemukan pada penyimpanan.');
        }

        $this->logAccess($document);

        $size = $disk->size($document->file_path);
        $mime = $document->mime_type ?: 'application/octet-stream';
        $filename = $document->original_filename;

        $headers = [
            'Content-Type' => $mime,
            'Content-Disposition' => $this->contentDisposition($disposition, $filename),
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'private, max-age=0, must-revalidate',
            'X-Content-Type-Options' => 'nosniff',
        ];

        // If the viewer did not ask for a specific range, stream the whole file.
        $range = $request->header('Range');
        if (! $range || ! preg_match('/bytes=(\d*)-(\d*)/', $range, $m)) {
            return response()->streamDownload(
                fn () => fpassthru($disk->readStream($document->file_path)),
                $filename,
                $headers + ['Content-Length' => (string) $size],
            );
        }

        $start = $m[1] === '' ? 0 : (int) $m[1];
        $end = $m[2] === '' ? $size - 1 : (int) $m[2];
        $end = min($end, $size - 1);
        $length = max($end - $start + 1, 0);

        $headers['Content-Range'] = "bytes {$start}-{$end}/{$size}";
        $headers['Content-Length'] = (string) $length;

        return response()->stream(function () use ($disk, $document, $start, $length) {
            $stream = $disk->readStream($document->file_path);
            fseek($stream, $start);
            $remaining = $length;
            while ($remaining > 0 && ! feof($stream)) {
                $chunk = fread($stream, (int) min(8192, $remaining));
                if ($chunk === false) {
                    break;
                }
                echo $chunk;
                $remaining -= strlen($chunk);
            }
            fclose($stream);
        }, 206, $headers);
    }

    private function contentDisposition(string $disposition, string $filename): string
    {
        $safe = str_replace('"', '', $filename);

        return $disposition.'; filename="'.$safe.'"; filename*=UTF-8\'\''.rawurlencode($filename);
    }

    private function logAccess(Document $document): void
    {
        $user = request()->user();
        app(\App\Services\ActivityLogService::class)->log(
            'document',
            $document->id,
            'document.accessed',
            "Document {$document->original_filename} accessed",
            ['user' => $user?->name],
        );
    }
}
