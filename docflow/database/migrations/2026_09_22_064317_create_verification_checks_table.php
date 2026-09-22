<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verification_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('verification_run_id')->constrained('verification_runs')->cascadeOnDelete();
            $table->string('rule_key', 60);
            $table->string('rule_label');
            $table->string('status', 20);
            $table->text('message');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['verification_run_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_checks');
    }
};
