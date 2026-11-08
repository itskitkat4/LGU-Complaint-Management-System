<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_escalations', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('complaint_id');
            $table->string('escalation_type');

            $table->uuid('requested_by');

            $table->uuid('origin_barangay_id')->nullable();
            $table->uuid('origin_department_id')->nullable();
            $table->uuid('destination_department_id')->nullable();

            $table->string('higher_authority_office')->nullable();

            $table->text('reason');

            $table->string('status')->default('pending');

            $table->uuid('reviewed_by')->nullable();
            $table->text('review_comment')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            $table->text('outcome_notes')->nullable();
            $table->uuid('outcome_recorded_by')->nullable();
            $table->timestamp('outcome_recorded_at')->nullable();

            $table->timestamps();

            // Foreign keys
            $table->foreign('complaint_id')
                ->references('id')->on('complaints')
                ->cascadeOnDelete();

            $table->foreign('requested_by')
                ->references('id')->on('profiles')
                ->restrictOnDelete();

            $table->foreign('origin_barangay_id')
                ->references('id')->on('barangays')
                ->restrictOnDelete();

            $table->foreign('origin_department_id')
                ->references('id')->on('departments')
                ->restrictOnDelete();

            $table->foreign('destination_department_id')
                ->references('id')->on('departments')
                ->restrictOnDelete();

            $table->foreign('reviewed_by')
                ->references('id')->on('profiles')
                ->restrictOnDelete();

            $table->foreign('outcome_recorded_by')
                ->references('id')->on('profiles')
                ->restrictOnDelete();

            // Indexes
            $table->index(['complaint_id', 'status']);
            $table->index(['destination_department_id', 'status']);
            $table->index('requested_by');
        });

        // Allowed escalation types
        DB::statement("
            ALTER TABLE complaint_escalations
            ADD CONSTRAINT complaint_escalations_type_check
            CHECK (
                escalation_type IN (
                    'barangay_to_department',
                    'department_to_higher_authority'
                )
            )
        ");

        // Allowed escalation statuses
        DB::statement("
            ALTER TABLE complaint_escalations
            ADD CONSTRAINT complaint_escalations_status_check
            CHECK (
                status IN (
                    'pending',
                    'accepted',
                    'redirected',
                    'completed'
                )
            )
        ");

        // Validate the origin and destination based on escalation type
        DB::statement("
            ALTER TABLE complaint_escalations
            ADD CONSTRAINT complaint_escalations_route_check
            CHECK (
                (
                    escalation_type = 'barangay_to_department'
                    AND origin_barangay_id IS NOT NULL
                    AND origin_department_id IS NULL
                    AND destination_department_id IS NOT NULL
                    AND higher_authority_office IS NULL
                )
                OR
                (
                    escalation_type = 'department_to_higher_authority'
                    AND origin_department_id IS NOT NULL
                    AND origin_barangay_id IS NULL
                    AND destination_department_id IS NULL
                    AND higher_authority_office IS NOT NULL
                    AND TRIM(higher_authority_office) <> ''
                )
            )
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_escalations');
    }
};