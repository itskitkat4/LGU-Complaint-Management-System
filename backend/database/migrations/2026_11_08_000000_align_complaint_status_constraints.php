<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Keep the documented lifecycle available while retaining the values
        // used by the currently implemented staff review endpoint.
        DB::statement('ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check');
        DB::statement(<<<'SQL'
            ALTER TABLE complaints
            ADD CONSTRAINT complaints_status_check
            CHECK (status IN (
                'submitted', 'under_review', 'accepted', 'declined',
                'assigned', 'in_progress', 'pending_review', 'resolved',
                'rejected', 'closed'
            ))
        SQL);

        DB::statement('ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_rejection_reason_check');
        DB::statement(<<<'SQL'
            ALTER TABLE complaints
            ADD CONSTRAINT complaints_rejection_reason_check
            CHECK (
                status NOT IN ('declined', 'rejected')
                OR (
                    rejection_reason IS NOT NULL
                    AND LENGTH(TRIM(rejection_reason)) > 0
                )
            )
        SQL);

        DB::statement('ALTER TABLE complaint_updates DROP CONSTRAINT IF EXISTS complaint_updates_new_status_check');
        DB::statement(<<<'SQL'
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_new_status_check
            CHECK (new_status IN (
                'submitted', 'under_review', 'accepted', 'declined',
                'assigned', 'in_progress', 'pending_review', 'resolved',
                'rejected', 'closed'
            ))
        SQL);

        DB::statement('ALTER TABLE complaint_updates DROP CONSTRAINT IF EXISTS complaint_updates_old_status_check');
        DB::statement(<<<'SQL'
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_old_status_check
            CHECK (
                old_status IS NULL OR old_status IN (
                    'submitted', 'under_review', 'accepted', 'declined',
                    'assigned', 'in_progress', 'pending_review', 'resolved',
                    'rejected', 'closed'
                )
            )
        SQL);
    }

    public function down(): void
    {
        // Retain the expanded constraints on rollback: deployed rows may
        // already use the additional workflow statuses.
    }
};
