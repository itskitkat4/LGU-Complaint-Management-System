<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const COMPOSITE_UNIQUE = 'complaints_id_citizen_id_unique';

    private const OWNER_FOREIGN = 'feedback_complaint_citizen_owner_foreign';

    private const SQLITE_TRIGGERS = [
        'feedback_complaint_citizen_owner_insert_check',
        'feedback_complaint_citizen_owner_update_check',
        'complaints_feedback_owner_update_check',
    ];

    public function up(): void
    {
        $mismatchCount = $this->countOwnershipMismatches();

        if ($mismatchCount > 0) {
            throw new RuntimeException(
                "Feedback ownership preflight found {$mismatchCount} invalid record(s); "
                . 'no ownership constraint was applied. Review feedback complaint/citizen references before retrying.'
            );
        }

        if (DB::getDriverName() === 'sqlite') {
            $this->applySqliteOwnershipChecks();

            return;
        }

        if (DB::getDriverName() !== 'pgsql') {
            throw new RuntimeException('Feedback ownership migration supports PostgreSQL and SQLite only.');
        }

        DB::statement(sprintf(
            'ALTER TABLE complaints ADD CONSTRAINT %s UNIQUE (id, citizen_id)',
            self::COMPOSITE_UNIQUE
        ));

        DB::statement(sprintf(
            'ALTER TABLE feedback ADD CONSTRAINT %s '
            . 'FOREIGN KEY (complaint_id, citizen_id) '
            . 'REFERENCES complaints (id, citizen_id) ON DELETE CASCADE',
            self::OWNER_FOREIGN
        ));
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            foreach (self::SQLITE_TRIGGERS as $trigger) {
                DB::statement("DROP TRIGGER IF EXISTS {$trigger}");
            }

            DB::statement('DROP INDEX IF EXISTS ' . self::COMPOSITE_UNIQUE);

            return;
        }

        if (DB::getDriverName() !== 'pgsql') {
            throw new RuntimeException('Feedback ownership migration supports PostgreSQL and SQLite only.');
        }

        DB::statement('ALTER TABLE feedback DROP CONSTRAINT IF EXISTS ' . self::OWNER_FOREIGN);
        DB::statement('ALTER TABLE complaints DROP CONSTRAINT IF EXISTS ' . self::COMPOSITE_UNIQUE);
    }

    private function countOwnershipMismatches(): int
    {
        return DB::table('feedback as f')
            ->leftJoin('complaints as c', 'c.id', '=', 'f.complaint_id')
            ->leftJoin('profiles as p', 'p.id', '=', 'f.citizen_id')
            ->where(function (Builder $query): void {
                $query->whereNull('f.complaint_id')
                    ->orWhereNull('f.citizen_id')
                    ->orWhereNull('c.id')
                    ->orWhereNull('p.id')
                    ->orWhereColumn('f.citizen_id', '<>', 'c.citizen_id');
            })
            ->count();
    }

    private function applySqliteOwnershipChecks(): void
    {
        DB::statement(sprintf(
            'CREATE UNIQUE INDEX IF NOT EXISTS %s ON complaints (id, citizen_id)',
            self::COMPOSITE_UNIQUE
        ));

        foreach (self::SQLITE_TRIGGERS as $trigger) {
            DB::statement("DROP TRIGGER IF EXISTS {$trigger}");
        }

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER feedback_complaint_citizen_owner_insert_check
            BEFORE INSERT ON feedback
            WHEN NOT EXISTS (
                SELECT 1
                FROM complaints
                WHERE id = NEW.complaint_id
                  AND citizen_id = NEW.citizen_id
            )
            BEGIN
                SELECT RAISE(ABORT, 'feedback complaint owner constraint failed');
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER feedback_complaint_citizen_owner_update_check
            BEFORE UPDATE OF complaint_id, citizen_id ON feedback
            WHEN NOT EXISTS (
                SELECT 1
                FROM complaints
                WHERE id = NEW.complaint_id
                  AND citizen_id = NEW.citizen_id
            )
            BEGIN
                SELECT RAISE(ABORT, 'feedback complaint owner constraint failed');
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER complaints_feedback_owner_update_check
            BEFORE UPDATE OF citizen_id ON complaints
            WHEN NEW.citizen_id IS NOT OLD.citizen_id
             AND EXISTS (
                SELECT 1 FROM feedback WHERE complaint_id = OLD.id
             )
            BEGIN
                SELECT RAISE(ABORT, 'complaint feedback owner constraint failed');
            END
        SQL);
    }
};
