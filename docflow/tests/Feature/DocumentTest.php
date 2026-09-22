<?php

namespace Tests\Feature;

use App\Enums\DocumentStatus;
use App\Enums\DocumentType;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Document;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentTest extends TestCase
{
    use RefreshDatabase;

    private User $operator;
    private Customer $customer;
    private Transaction $transaction;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->operator = User::factory()->create(['role' => UserRole::OPERATOR, 'is_active' => true]);
        $this->customer = Customer::create([
            'customer_code' => 'CUST-0001',
            'name' => 'PT Test Customer',
            'status' => 'ACTIVE',
        ]);
        $this->transaction = Transaction::create([
            'transaction_code' => 'TRX-2026-00001',
            'customer_id' => $this->customer->id,
            'transaction_date' => '2026-05-01',
            'status' => TransactionStatus::PROCESSING,
            'subtotal' => 1000,
            'total_amount' => 1000,
            'created_by' => $this->operator->id,
        ]);
    }

    public function test_operator_can_upload_a_valid_document(): void
    {
        $file = UploadedFile::fake()->create('invoice.pdf', 100, 'application/pdf');

        $response = $this->actingAs($this->operator)->postJson(
            "/api/transactions/{$this->transaction->id}/documents",
            [
                'file' => $file,
                'document_type' => 'INVOICE',
                'document_number' => 'INV-1',
            ],
        );

        $response->assertCreated()->assertJsonPath('data.document_type', 'INVOICE');

        $document = Document::firstOrFail();
        $this->assertSame(DocumentStatus::UPLOADED, $document->status);
        $this->assertSame(1, $document->current_version);
        Storage::disk('local')->assertExists($document->file_path);
        $this->assertDatabaseHas('document_versions', ['document_id' => $document->id, 'version' => 1]);
    }

    public function test_upload_rejects_disallowed_mime_type(): void
    {
        $file = UploadedFile::fake()->create('script.exe', 10, 'application/x-msdownload');

        $this->actingAs($this->operator)->postJson(
            "/api/transactions/{$this->transaction->id}/documents",
            ['file' => $file, 'document_type' => 'INVOICE'],
        )->assertStatus(422)->assertJsonValidationErrors('file');

        $this->assertSame(0, Document::count());
    }

    public function test_upload_rejects_oversized_file(): void
    {
        $file = UploadedFile::fake()->create('big.pdf', 20 * 1024, 'application/pdf'); // 20 MB > 10 MB

        $this->actingAs($this->operator)->postJson(
            "/api/transactions/{$this->transaction->id}/documents",
            ['file' => $file, 'document_type' => 'INVOICE'],
        )->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_stored_filename_is_sanitized_against_path_traversal(): void
    {
        // A malicious client filename must not escape the transaction directory.
        $file = UploadedFile::fake()->create('..\\..\\evil.pdf', 10, 'application/pdf');

        $this->actingAs($this->operator)->postJson(
            "/api/transactions/{$this->transaction->id}/documents",
            ['file' => $file, 'document_type' => 'INVOICE'],
        )->assertCreated();

        $document = Document::firstOrFail();
        $this->assertStringNotContainsString('..', $document->stored_filename);
        $this->assertStringNotContainsString('..', $document->file_path);
        $this->assertStringStartsWith("transactions/TRX-2026-00001/", $document->file_path);
    }

    public function test_replacing_a_document_creates_a_new_version_without_overwriting(): void
    {
        $first = UploadedFile::fake()->create('invoice.pdf', 10, 'application/pdf');
        $documentId = $this->actingAs($this->operator)->postJson(
            "/api/transactions/{$this->transaction->id}/documents",
            ['file' => $first, 'document_type' => 'INVOICE'],
        )->json('data.id');

        $second = UploadedFile::fake()->create('invoice-corrected.pdf', 12, 'application/pdf');
        $this->actingAs($this->operator)->postJson(
            "/api/documents/{$documentId}/versions",
            ['file' => $second, 'change_note' => 'Corrected amount'],
        )->assertOk()->assertJsonPath('data.current_version', 2);

        $document = Document::findOrFail($documentId);
        $this->assertSame(2, $document->current_version);
        $this->assertSame(2, $document->versions()->count());
        // The original version file must still exist (no silent overwrite).
        $this->assertDatabaseHas('document_versions', ['document_id' => $documentId, 'version' => 1]);
        $this->assertDatabaseHas('document_versions', ['document_id' => $documentId, 'version' => 2]);
    }

    public function test_reviewer_can_verify_and_reject_a_document(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::REVIEWER, 'is_active' => true]);
        $file = UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf');

        $documentId = $this->actingAs($this->operator)->postJson(
            "/api/transactions/{$this->transaction->id}/documents",
            ['file' => $file, 'document_type' => 'INVOICE'],
        )->json('data.id');

        $this->actingAs($reviewer)->postJson("/api/documents/{$documentId}/verify")->assertOk();
        $this->assertSame(DocumentStatus::VERIFIED, Document::find($documentId)->status);

        $this->actingAs($reviewer)
            ->postJson("/api/documents/{$documentId}/reject", ['reason' => 'Illegible scan'])
            ->assertOk();
        $this->assertSame(DocumentStatus::REJECTED, Document::find($documentId)->status);
    }

    public function test_reject_requires_a_reason(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::REVIEWER, 'is_active' => true]);
        $file = UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf');

        $documentId = $this->actingAs($this->operator)->postJson(
            "/api/transactions/{$this->transaction->id}/documents",
            ['file' => $file, 'document_type' => 'INVOICE'],
        )->json('data.id');

        $this->actingAs($reviewer)
            ->postJson("/api/documents/{$documentId}/reject", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reason');
    }

    public function test_operator_cannot_verify_a_document(): void
    {
        $file = UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf');
        $documentId = $this->actingAs($this->operator)->postJson(
            "/api/transactions/{$this->transaction->id}/documents",
            ['file' => $file, 'document_type' => 'INVOICE'],
        )->json('data.id');

        $this->actingAs($this->operator)->postJson("/api/documents/{$documentId}/verify")->assertForbidden();
    }

    public function test_document_download_streams_the_file(): void
    {
        $file = UploadedFile::fake()->create('invoice.pdf', 10, 'application/pdf');
        $documentId = $this->actingAs($this->operator)->postJson(
            "/api/transactions/{$this->transaction->id}/documents",
            ['file' => $file, 'document_type' => 'INVOICE'],
        )->json('data.id');

        $this->actingAs($this->operator)->get("/api/documents/{$documentId}/download")->assertOk();
    }
}
