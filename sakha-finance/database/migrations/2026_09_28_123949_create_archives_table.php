<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Arsip — digital archive of Finance documents.
 *
 * Represents the physical/digital filing workflow (scan → rename → classify →
 * store → filling → search). Each row is one archived document with enough
 * metadata to be located again by year, month, type and customer/vendor.
 *
 * A document may or may not be linked to a transaction: supporting documents
 * such as purchase invoices or journals often arrive on their own.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('archives', function (Blueprint $table) {
            $table->id();
            $table->string('archive_code', 40)->unique();

            // Optional links: an archive entry is not always tied to a transaction.
            $table->foreignId('document_id')->nullable()->constrained('documents')->nullOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();

            $table->string('document_type', 40)->index();
            $table->string('document_name');
            $table->string('document_number', 80)->nullable()->index();
            $table->string('file_name')->nullable();
            $table->date('document_date')->nullable()->index();

            // Filing coordinates: Tahun → Bulan → Jenis → Customer → Dokumen
            $table->unsignedSmallInteger('period_year')->index();
            $table->unsignedTinyInteger('period_month')->index();
            $table->string('archive_location', 120)->nullable(); // e.g. "Bantex A–L / 2026 / 03"

            $table->string('status', 30)->default('STORED')->index();
            $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['period_year', 'period_month', 'document_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('archives');
    }
};
