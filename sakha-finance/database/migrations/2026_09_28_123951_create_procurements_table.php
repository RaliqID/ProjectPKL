<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pengadaan barang + SPB (lightweight). Records purchased items with their
 * tracking reference and doubles as the SPB register; not a procurement ERP.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('procurements', function (Blueprint $table) {
            $table->id();
            $table->string('procurement_code', 40)->unique();
            $table->string('spb_number', 60)->nullable()->index(); // Buku SPB

            $table->date('request_date')->index();
            $table->string('item_name');
            $table->string('supplier', 120)->nullable();    // Marketplace / Supplier
            $table->decimal('unit_price', 16, 2)->default(0);
            $table->unsignedInteger('quantity')->default(1);
            $table->string('unit', 30)->nullable();         // Satuan: pcs, unit, box
            $table->string('division', 80)->nullable();     // Divisi peminta
            $table->string('purpose', 160)->nullable();     // Keperluan (SPB)
            $table->decimal('total_amount', 16, 2)->default(0);

            $table->string('tracking_number', 80)->nullable()->index(); // Resi
            $table->foreignId('document_id')->nullable()->constrained('documents')->nullOnDelete();

            $table->string('status', 30)->default('REQUESTED')->index(); // REQUESTED|ORDERED|SHIPPED|RECEIVED|CANCELLED
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('procurements');
    }
};
