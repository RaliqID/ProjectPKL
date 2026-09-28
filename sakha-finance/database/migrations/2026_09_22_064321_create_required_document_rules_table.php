<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('required_document_rules', function (Blueprint $table) {
            $table->id();
            $table->string('document_type', 40);
            $table->boolean('is_required')->default(true);
            $table->boolean('is_active')->default(true);
            $table->string('description')->nullable();
            $table->timestamps();

            $table->unique('document_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('required_document_rules');
    }
};
