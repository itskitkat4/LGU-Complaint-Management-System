
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_summaries', function (Blueprint $table) {
            $table->id();

            // Parent report.
            $table->foreignId('report_id')
                ->constrained('reports')
                ->cascadeOnDelete();

            // Allowed types: status, category, month.
            $table->string('summary_type', 20);

            // Status name, category name, or month label.
            $table->string('label', 150);

            // Used only for category summaries.
            $table->foreignUuid('category_id')
                ->nullable()
                ->constrained('complaint_categories')
                ->restrictOnDelete();

            // Used for status and category summaries.
            $table->unsignedInteger('total')->nullable();

            // Used for monthly summaries.
            $table->unsignedInteger('received')->nullable();
            $table->unsignedInteger('resolved')->nullable();

            // First day of the month for monthly summaries.
            $table->date('month')->nullable();

            $table->timestamps();

            // Prevent duplicate status entries per report.
            $table->unique(
                ['report_id', 'summary_type', 'label'],
                'report_summaries_unique_label'
            );

            // Prevent duplicate category references per report.
            $table->unique(
                ['report_id', 'category_id'],
                'report_summaries_unique_category'
            );

            // Prevent duplicate months per report.
            $table->unique(
                ['report_id', 'month'],
                'report_summaries_unique_month'
            );

            $table->index(['report_id', 'summary_type']);
        });

        // PostgreSQL data integrity constraints.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE report_summaries
                ADD CONSTRAINT report_summaries_valid_type
                CHECK (
                    (
                        summary_type = 'status'
                        AND category_id IS NULL
                        AND total IS NOT NULL
                        AND total >= 0
                        AND received IS NULL
                        AND resolved IS NULL
                        AND month IS NULL
                    )
                    OR
                    (
                        summary_type = 'category'
                        AND category_id IS NOT NULL
                        AND total IS NOT NULL
                        AND total >= 0
                        AND received IS NULL
                        AND resolved IS NULL
                        AND month IS NULL
                    )
                    OR
                    (
                        summary_type = 'month'
                        AND category_id IS NULL
                        AND total IS NULL
                        AND received IS NOT NULL
                        AND received >= 0
                        AND resolved IS NOT NULL
                        AND resolved >= 0
                        AND month IS NOT NULL
                        AND EXTRACT(DAY FROM month) = 1
                    )
                )
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('report_summaries');
    }
};
