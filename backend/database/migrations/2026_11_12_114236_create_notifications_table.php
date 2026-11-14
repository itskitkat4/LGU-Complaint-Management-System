
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('profile_id')
                ->constrained('profiles')
                ->restrictOnDelete();

            $table->foreignUuid('complaint_id')
                ->nullable()
                ->constrained('complaints')
                ->nullOnDelete();

            $table->string('title');
            $table->text('message');
            $table->string('type', 50);
            $table->boolean('is_read')->default(false);
            $table->timestampTz('read_at')->nullable();

            $table->timestampsTz();

            $table->index(
                ['profile_id', 'created_at'],
                'notifications_profile_id_created_at_index'
            );

            $table->index(
                ['profile_id', 'is_read'],
                'notifications_profile_id_is_read_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
