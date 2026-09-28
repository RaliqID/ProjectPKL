<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Finance-relevant delivery fields.
 *
 * The existing deliveries table already covers courier, tracking and status.
 * Finance additionally needs the document references it works with: the delivery
 * order number and the tanda terima (handover note), plus the expedition name
 * used in Indonesian practice. These are additive and nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('delivery_order_number', 60)->nullable()->after('delivery_number');
            $table->string('expedition', 60)->nullable()->after('courier');
            $table->string('receipt_number', 80)->nullable()->after('tracking_number');      // Resi
            $table->string('handover_number', 80)->nullable()->after('receipt_number');       // Tanda Terima
            $table->date('handover_date')->nullable()->after('delivered_at');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn([
                'delivery_order_number', 'expedition', 'receipt_number', 'handover_number', 'handover_date',
            ]);
        });
    }
};
