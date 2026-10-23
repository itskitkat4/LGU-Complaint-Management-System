
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaint_attachments', function (Blueprint $table) {
            $table->uuid('resolution_id')->nullable();

            $table->foreign('resolution_id')
                ->references('id')
                ->on('complaint_resolutions')
                ->nullOnDelete();

            $table->index('resolution_id');
        });
    }

    public function down(): void
    {
        Schema::table('complaint_attachments', function (Blueprint $table) {
            $table->dropForeign(['resolution_id']);
            $table->dropIndex(['resolution_id']);
            $table->dropColumn('resolution_id');
        });
    }
};
