<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Restore the canonical complaint status constraint.
        DB::statement("
            ALTER TABLE complaints
            DROP CONSTRAINT IF EXISTS complaints_status_check
        ");

        DB::statement("
            ALTER TABLE complaints
            ADD CONSTRAINT complaints_status_check
            CHECK (status IN (
                'submitted',
                'under_review',
                'accepted',
                'assigned',
                'in_progress',
                'resolved',
                'closed',
                'rejected'
            ))
        ");

        // Require a reason when a complaint is rejected.
        DB::statement("
            ALTER TABLE complaints
            DROP CONSTRAINT IF EXISTS complaints_rejection_reason_check
        ");

        DB::statement("
            ALTER TABLE complaints
            ADD CONSTRAINT complaints_rejection_reason_check
            CHECK (
                status <> 'rejected'
                OR (
                    rejection_reason IS NOT NULL
                    AND LENGTH(TRIM(rejection_reason)) > 0
                )
            )
        ");

        // Restore complaint update history status constraints.
        DB::statement("
            ALTER TABLE complaint_updates
            DROP CONSTRAINT IF EXISTS complaint_updates_new_status_check
        ");

        DB::statement("
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_new_status_check
            CHECK (new_status IN (
                'submitted',
                'under_review',
                'accepted',
                'assigned',
                'in_progress',
                'resolved',
                'closed',
                'rejected'
            ))
        ");

        DB::statement("
            ALTER TABLE complaint_updates
            DROP CONSTRAINT IF EXISTS complaint_updates_old_status_check
        ");

        DB::statement("
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_old_status_check
            CHECK (
                old_status IS NULL
                OR old_status IN (
                    'submitted',
                    'under_review',
                    'accepted',
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
        // Restore the previous constraints if this migration is rolled back.
        // The previous migration's accepted/declined statuses are restored.
        DB::statement("
            ALTER TABLE complaints
            DROP CONSTRAINT IF EXISTS complaints_status_check
        ");

        DB::statement("
            ALTER TABLE complaints
            ADD CONSTRAINT complaints_status_check
            CHECK (status IN (
                'submitted',
                'under_review',
                'accepted',
                'declined',
                'assigned',
                'in_progress',
                'pending_review',
                'resolved'
            ))
        ");

        DB::statement("
            ALTER TABLE complaints
            DROP CONSTRAINT IF EXISTS complaints_rejection_reason_check
        ");

        DB::statement("
            ALTER TABLE complaints
            ADD CONSTRAINT complaints_rejection_reason_check
            CHECK (
                status <> 'declined'
                OR (
                    rejection_reason IS NOT NULL
                    AND LENGTH(TRIM(rejection_reason)) > 0
                )
            )
        ");

        DB::statement("
            ALTER TABLE complaint_updates
            DROP CONSTRAINT IF EXISTS complaint_updates_new_status_check
        ");

        DB::statement("
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_new_status_check
            CHECK (new_status IN (
                'submitted',
                'under_review',
                'accepted',
                'declined',
                'assigned',
                'in_progress',
                'pending_review',
                'resolved'
            ))
        ");

        DB::statement("
            ALTER TABLE complaint_updates
            DROP CONSTRAINT IF EXISTS complaint_updates_old_status_check
        ");

        DB::statement("
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_old_status_check
            CHECK (
                old_status IS NULL
                OR old_status IN (
                    'submitted',
                    'under_review',
                    'accepted',
                    'declined',
                    'assigned',
                    'in_progress',
                    'pending_review',
                    'resolved'
                )
            )
        ");
    }
};
