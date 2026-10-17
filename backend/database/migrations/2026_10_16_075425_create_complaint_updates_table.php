
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_updates', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('complaint_id');
            $table->uuid('updated_by');

            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->text('comment')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->foreign('complaint_id')
                ->references('id')
                ->on('complaints')
                ->cascadeOnDelete();

            $table->foreign('updated_by')
                ->references('id')
                ->on('profiles')
                ->restrictOnDelete();

            $table->index(['complaint_id', 'created_at']);
            $table->index('updated_by');
        });

        DB::statement("
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_new_status_check
            CHECK (new_status IN (
                'submitted',
                'under_review',
                'assigned',
                'in_progress',
                'resolved',
                'closed',
                'rejected'
            ))
        ");

        DB::statement("
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_old_status_check
            CHECK (
                old_status IS NULL
                OR old_status IN (
                    'submitted',
                    'under_review',
                    'assigned',
                    'in_progress',
                    'resolved',
                    'closed',
                    'rejected'
                )
            )
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_updates');
    }
};
