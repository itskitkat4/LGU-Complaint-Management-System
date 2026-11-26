
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Database\SqliteComplaintStatusConstraints;

return new class extends Migration
{
    use SqliteComplaintStatusConstraints;

    private const CANONICAL_STATUSES = "
        'submitted', 'under_review', 'accepted', 'declined',
        'assigned', 'in_progress', 'resolved'
    ";

    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->applySqliteComplaintStatusConstraints();

            return;
        }

        DB::statement('ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check');
        DB::statement("
            ALTER TABLE complaints
            ADD CONSTRAINT complaints_status_check
            CHECK (status IN (" . self::CANONICAL_STATUSES . "))
        ");

        DB::statement('ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_rejection_reason_check');
        DB::statement(<<<'SQL'
            ALTER TABLE complaints
            ADD CONSTRAINT complaints_rejection_reason_check
            CHECK (
                status <> 'declined'
                OR (
                    rejection_reason IS NOT NULL
                    AND LENGTH(TRIM(rejection_reason)) > 0
                )
            )
        SQL);

        DB::statement('ALTER TABLE complaint_updates DROP CONSTRAINT IF EXISTS complaint_updates_new_status_check');
        DB::statement("
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_new_status_check
            CHECK (new_status IN (" . self::CANONICAL_STATUSES . "))
        ");

        DB::statement('ALTER TABLE complaint_updates DROP CONSTRAINT IF EXISTS complaint_updates_old_status_check');
        DB::statement("
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_old_status_check
            CHECK (
                old_status IS NULL
                OR old_status IN (" . self::CANONICAL_STATUSES . ")
            )
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->applySqliteComplaintStatusConstraints();

            return;
        }

        DB::statement('ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check');
        DB::statement("
            ALTER TABLE complaints
            ADD CONSTRAINT complaints_status_check
            CHECK (status IN (" . self::CANONICAL_STATUSES . "))
        ");

        DB::statement('ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_rejection_reason_check');
        DB::statement(<<<'SQL'
            ALTER TABLE complaints
            ADD CONSTRAINT complaints_rejection_reason_check
            CHECK (
                status <> 'declined'
                OR (
                    rejection_reason IS NOT NULL
                    AND LENGTH(TRIM(rejection_reason)) > 0
                )
            )
        SQL);

        DB::statement('ALTER TABLE complaint_updates DROP CONSTRAINT IF EXISTS complaint_updates_new_status_check');
        DB::statement("
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_new_status_check
            CHECK (new_status IN (" . self::CANONICAL_STATUSES . "))
        ");

        DB::statement('ALTER TABLE complaint_updates DROP CONSTRAINT IF EXISTS complaint_updates_old_status_check');
        DB::statement("
            ALTER TABLE complaint_updates
            ADD CONSTRAINT complaint_updates_old_status_check
            CHECK (
                old_status IS NULL
                OR old_status IN (" . self::CANONICAL_STATUSES . ")
            )
        ");
    }
};
