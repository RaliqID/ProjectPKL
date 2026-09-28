<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pengeluaran operasional Finance — primarily "Claim Bensin".
 *
 * Kept intentionally light: this records operational expenses for
 * reimbursement, it is not an accounting ledger.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('expense_code', 40)->unique();
            $table->string('category', 40)->default('FUEL')->index(); // FUEL | TOLL | OTHER

            $table->date('expense_date')->index();
            $table->string('vehicle', 60)->nullable();
            $table->unsignedInteger('odometer_km')->nullable();
            $table->string('station', 80)->nullable();          // SPBU
            $table->string('fuel_type', 40)->nullable();        // Pertalite, Pertamax, Solar
            $table->decimal('amount', 16, 2)->default(0);
            $table->string('proof_reference', 120)->nullable(); // no. nota / bukti
            $table->foreignId('document_id')->nullable()->constrained('documents')->nullOnDelete();

            $table->string('status', 30)->default('DRAFT')->index(); // DRAFT|SUBMITTED|APPROVED|REJECTED|PAID
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
