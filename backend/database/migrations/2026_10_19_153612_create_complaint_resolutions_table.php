
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_resolutions', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('complaint_id');
            $table->uuid('submitted_by');

            $table->text('resolution_description');

            $table->string('review_status')->default('pending_review');

            $table->uuid('reviewed_by')->nullable();
            $table->text('review_comment')->nullable();

            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();

            $table->foreign('complaint_id')
                ->references('id')
                ->on('complaints')
                ->cascadeOnDelete();

            $table->foreign('submitted_by')
                ->references('id')
                ->on('profiles')
                ->restrictOnDelete();

            $table->foreign('reviewed_by')
                ->references('id')
                ->on('profiles')
                ->restrictOnDelete();

            $table->index(['complaint_id', 'submitted_at']);
            $table->index('submitted_by');
            $table->index('review_status');
        });

        DB::statement("
            ALTER TABLE complaint_resolutions
            ADD CONSTRAINT complaint_resolutions_review_status_check
            CHECK (
                review_status IN (
                    'pending_review',
                    'approved',
                    'returned'
                )
            )
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_resolutions');
    }
};
