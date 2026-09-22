<?php

namespace App\Services;

use App\Enums\DocumentStatus;
use App\Enums\DocumentType;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DocumentService
{
    public const ALLOWED_MIMES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    public const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

    public const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    public function __construct(private readonly ActivityLogService $activity) {}

    /**
     * Validate an incoming uploaded file. Throws ValidationException on failure.
     */
    public function validateUpload(UploadedFile $file): void
    {
        if (! $file->isValid()) {
            throw ValidationException::withMessages(['file' => 'The uploaded file is not valid.']);
        }

        $mime = $file->getMimeType();
        if (! in_array($mime, self::ALLOWED_MIMES, true)) {
            throw ValidationException::withMessages([
                'file' => 'Unsupported file type. Allowed: PDF, JPG, PNG, WEBP.',
            ]);
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: '');
        if (! in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
            throw ValidationException::withMessages([
                'file' => 'Unsupported file extension. Allowed: '.implode(', ', self::ALLOWED_EXTENSIONS).'.',
            ]);
        }

        if ($file->getSize() > self::MAX_FILE_SIZE) {
            throw ValidationException::withMessages([
                'file' => 'File is larger than the 10 MB limit.',
            ]);
        }
    }

    /**
     * Sanitize a user-provided filename into a safe base name.
     * Never trust the client filename for storage.
     */
    public function sanitizeBaseName(string $name): string
    {
        $base = pathinfo($name, PATHINFO_FILENAME);
        $base = Str::ascii($base);
        $base = preg_replace('/[^A-Za-z0-9\-_ ]+/', '-', $base) ?? $base;
        $base = preg_replace('/\s+/', '-', trim($base)) ?? $base;
        $base = trim($base, '-_');
        $base = Str::limit($base === '' ? 'document' : $base, 80, '');

        // Defensive: strip any residual traversal markers.
        $base = str_replace(['..', '/', '\\'], '', $base);

        return $base === '' ? 'document' : $base;
    }

    /**
     * Build the target directory for a document:
     * transactions/{CODE}/{folder}
     */
    public function directoryFor(Transaction $transaction, DocumentType $type): string
    {
        $code = preg_replace('/[^A-Za-z0-9\-]/', '', $transaction->transaction_code);

        return "transactions/{$code}/{$type->folder()}";
    }

    /**
     * Store a brand new document (version 1).
     */
    public function store(Transaction $transaction, User $actor, UploadedFile $file, DocumentType $type, ?string $documentNumber = null): Document
    {
        $this->validateUpload($file);

        $dir = $this->directoryFor($transaction, $type);
        $base = $this->sanitizeBaseName($file->getClientOriginalName());
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $stored = $base.'-v1.'.$ext;

        $path = $file->storeAs($dir, $stored, 'local');

        $document = Document::create([
            'transaction_id' => $transaction->id,
            'document_type' => $type,
            'original_filename' => $file->getClientOriginalName(),
            'stored_filename' => $stored,
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'document_number' => $documentNumber,
            'uploaded_by' => $actor->id,
            'status' => DocumentStatus::UPLOADED,
            'current_version' => 1,
        ]);

        DocumentVersion::create([
            'document_id' => $document->id,
            'version' => 1,
            'original_filename' => $file->getClientOriginalName(),
            'stored_filename' => $stored,
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $actor->id,
            'change_note' => 'Initial upload',
        ]);

        $this->activity->logTransaction(
            $transaction->id,
            'document.uploaded',
            "{$type->label()} uploaded ({$file->getClientOriginalName()})",
            ['document_id' => $document->id, 'type' => $type->value, 'version' => 1],
        );

        return $document->refresh();
    }

    /**
     * Replace a document with a new version. Never silently overwrites files.
     */
    public function addVersion(Document $document, User $actor, UploadedFile $file, ?string $changeNote = null): Document
    {
        $this->validateUpload($file);

        $transaction = $document->transaction;
        if (! $transaction) {
            throw ValidationException::withMessages(['document' => 'Document is not attached to a transaction.']);
        }

        $nextVersion = ((int) $document->current_version) + 1;
        $dir = $this->directoryFor($transaction, $document->document_type);
        $base = $this->sanitizeBaseName($file->getClientOriginalName());
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $stored = $base.'-v'.$nextVersion.'.'.$ext;

        $path = $file->storeAs($dir, $stored, 'local');

        DocumentVersion::create([
            'document_id' => $document->id,
            'version' => $nextVersion,
            'original_filename' => $file->getClientOriginalName(),
            'stored_filename' => $stored,
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $actor->id,
            'change_note' => $changeNote,
        ]);

        $document->forceFill([
            'original_filename' => $file->getClientOriginalName(),
            'stored_filename' => $stored,
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'current_version' => $nextVersion,
            'status' => DocumentStatus::UPLOADED,
            'verified_at' => null,
            'verified_by' => null,
        ])->save();

        $this->activity->logTransaction(
            $transaction->id,
            'document.version_added',
            "{$document->document_type->label()} new version v{$nextVersion} uploaded",
            ['document_id' => $document->id, 'version' => $nextVersion, 'note' => $changeNote],
        );

        return $document->refresh();
    }

    public function verify(Document $document, User $actor): Document
    {
        $document->forceFill([
            'status' => DocumentStatus::VERIFIED,
            'verified_at' => now(),
            'verified_by' => $actor->id,
        ])->save();

        $this->activity->log(
            'document',
            $document->id,
            'document.verified',
            "Document {$document->original_filename} verified",
        );

        return $document->refresh();
    }

    public function reject(Document $document, User $actor, string $reason): Document
    {
        $document->forceFill(['status' => DocumentStatus::REJECTED])->save();

        $this->activity->log(
            'document',
            $document->id,
            'document.rejected',
            "Document {$document->original_filename} rejected",
            ['reason' => $reason],
        );

        if ($document->transaction) {
            app(NotificationService::class)->notifyDocumentRejected(
                $document->transaction,
                $document->document_type->label(),
            );
        }

        return $document->refresh();
    }

    public function archive(Document $document, User $actor): Document
    {
        $document->forceFill(['status' => DocumentStatus::ARCHIVED])->save();

        $this->activity->log('document', $document->id, 'document.archived', "Document {$document->original_filename} archived");

        return $document->refresh();
    }

    /**
     * Absolute path on the local disk. Kept private; controllers stream via Storage.
     */
    public function absolutePath(Document $document): string
    {
        return Storage::disk('local')->path($document->file_path);
    }
}
