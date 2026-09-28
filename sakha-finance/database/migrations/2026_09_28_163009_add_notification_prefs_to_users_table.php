<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-user notification preferences.
 *
 * email_notifications: master switch for email delivery (in-app always stays on).
 * notification_types: which categories the user wants, stored as JSON so new
 *   types can be added without a schema change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_notifications')->default(true)->after('theme_preference');
            $table->json('notification_types')->nullable()->after('email_notifications');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['email_notifications', 'notification_types']);
        });
    }
};
