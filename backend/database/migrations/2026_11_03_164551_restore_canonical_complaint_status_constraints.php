<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
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
                    'resolved'
                )
            )
        ");
    }

    public function down(): void
    {
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
                    'resolved'
                )
            )
        ");

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
    }
};
