<?php

namespace App\Database;

use Illuminate\Support\Facades\DB;

trait SqliteComplaintStatusConstraints
{
    private const SQLITE_STATUS_TRIGGERS = [
        'complaints_status_insert_check',
        'complaints_status_update_check',
        'complaint_updates_status_insert_check',
        'complaint_updates_status_update_check',
    ];

    protected function applySqliteComplaintStatusConstraints(): void
    {
        foreach (self::SQLITE_STATUS_TRIGGERS as $trigger) {
            DB::statement("DROP TRIGGER IF EXISTS {$trigger}");
        }

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER complaints_status_insert_check
            BEFORE INSERT ON complaints
            WHEN NEW.status IS NULL
            OR NEW.status NOT IN (
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
            WHEN NEW.status IS NULL
            OR NEW.status NOT IN (
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
            WHEN NEW.new_status IS NULL
            OR NEW.new_status NOT IN (
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
            WHEN NEW.new_status IS NULL
            OR NEW.new_status NOT IN (
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
}
