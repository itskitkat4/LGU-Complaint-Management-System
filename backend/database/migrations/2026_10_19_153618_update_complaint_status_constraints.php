
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const SQLITE_TRIGGERS = [
        'complaints_status_insert_check',
        'complaints_status_update_check',
        'complaint_updates_status_insert_check',
        'complaint_updates_status_update_check',
    ];

    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->applySqliteStatusChecks();

            return;
        }

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
        if (DB::getDriverName() === 'sqlite') {
            $this->applySqliteStatusChecks();

            return;
        }

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

    private function applySqliteStatusChecks(): void
    {
        foreach (self::SQLITE_TRIGGERS as $trigger) {
            DB::statement("DROP TRIGGER IF EXISTS {$trigger}");
        }

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER complaints_status_insert_check
            BEFORE INSERT ON complaints
            WHEN NEW.status NOT IN (
                'submitted',
                'under_review',
                'accepted',
                'declined',
                'assigned',
                'in_progress',
                'resolved'
            )
            OR (
                NEW.status = 'declined'
                AND (
                    NEW.rejection_reason IS NULL
                    OR LENGTH(TRIM(NEW.rejection_reason)) = 0
                )
            )
            BEGIN
                SELECT RAISE(ABORT, 'complaints status constraint failed');
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER complaints_status_update_check
            BEFORE UPDATE ON complaints
            WHEN NEW.status NOT IN (
                'submitted',
                'under_review',
                'accepted',
                'declined',
                'assigned',
                'in_progress',
                'resolved'
            )
            OR (
                NEW.status = 'declined'
                AND (
                    NEW.rejection_reason IS NULL
                    OR LENGTH(TRIM(NEW.rejection_reason)) = 0
                )
            )
            BEGIN
                SELECT RAISE(ABORT, 'complaints status constraint failed');
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER complaint_updates_status_insert_check
            BEFORE INSERT ON complaint_updates
            WHEN NEW.new_status NOT IN (
                'submitted',
                'under_review',
                'accepted',
                'declined',
                'assigned',
                'in_progress',
                'resolved'
            )
            OR (
                NEW.old_status IS NOT NULL
                AND NEW.old_status NOT IN (
                    'submitted',
                    'under_review',
                    'accepted',
                    'declined',
                    'assigned',
                    'in_progress',
                    'resolved'
                )
            )
            BEGIN
                SELECT RAISE(ABORT, 'complaint_updates status constraint failed');
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER complaint_updates_status_update_check
            BEFORE UPDATE ON complaint_updates
            WHEN NEW.new_status NOT IN (
                'submitted',
                'under_review',
                'accepted',
                'declined',
                'assigned',
                'in_progress',
                'resolved'
            )
            OR (
                NEW.old_status IS NOT NULL
                AND NEW.old_status NOT IN (
                    'submitted',
                    'under_review',
                    'accepted',
                    'declined',
                    'assigned',
                    'in_progress',
                    'resolved'
                )
            )
            BEGIN
                SELECT RAISE(ABORT, 'complaint_updates status constraint failed');
            END
        SQL);
    }
};
