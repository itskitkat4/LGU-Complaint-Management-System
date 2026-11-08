
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaint_assignments', function (Blueprint $table) {
            $table->uuid('barangay_id')->nullable();

            $table->uuid('department_id')->nullable();

            $table->foreign('barangay_id')
                ->references('id')
                ->on('barangays')
                ->restrictOnDelete();

            $table->foreign('department_id')
                ->references('id')
                ->on('departments')
                ->restrictOnDelete();
        });

        // Backfill the handling unit for assignments created before these
        // columns existed, so the constraint below can be added safely.
        DB::statement(<<<'SQL'
            UPDATE complaint_assignments AS ca
            SET barangay_id = (
                SELECT c.barangay_id
                FROM complaints AS c
                WHERE c.id = ca.complaint_id
            )
            WHERE ca.assignment_level = 'barangay'
              AND ca.barangay_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE complaint_assignments AS ca
            SET department_id = (
                SELECT p.department_id
                FROM profiles AS p
                WHERE p.id = ca.assigned_to
            )
            WHERE ca.assignment_level = 'lgu'
              AND ca.department_id IS NULL
        SQL);

        DB::statement("
            ALTER TABLE complaint_assignments
            ADD CONSTRAINT complaint_assignments_handling_unit_check
            CHECK (
                (
                    assignment_level = 'barangay'
                    AND barangay_id IS NOT NULL
                    AND department_id IS NULL
                )
                OR
                (
                    assignment_level = 'lgu'
                    AND department_id IS NOT NULL
                    AND barangay_id IS NULL
                )
            )
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE complaint_assignments
            DROP CONSTRAINT IF EXISTS complaint_assignments_handling_unit_check
        ");

        Schema::table('complaint_assignments', function (Blueprint $table) {
            $table->dropForeign(['barangay_id']);
            $table->dropForeign(['department_id']);

            $table->dropColumn(['barangay_id', 'department_id']);
        });
    }
};
