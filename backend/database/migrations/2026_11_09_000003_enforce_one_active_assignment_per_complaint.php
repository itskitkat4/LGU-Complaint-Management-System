<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const INDEX_NAME = 'complaint_assignments_one_active_per_complaint_unique';

    public function up(): void
    {
        $duplicates = DB::table('complaint_assignments')
            ->select('complaint_id')
            ->whereNull('ended_at')
            ->groupBy('complaint_id')
            ->havingRaw('COUNT(*) > 1')
            ->limit(1)
            ->exists();

        if ($duplicates) {
            throw new RuntimeException(
                'Cannot enforce one active assignment per complaint: duplicate active rows exist. Review and reconcile complaint_assignments before retrying this migration.'
            );
        }

        DB::statement('CREATE UNIQUE INDEX ' . self::INDEX_NAME . ' ON complaint_assignments (complaint_id) WHERE ended_at IS NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS ' . self::INDEX_NAME);
    }
};
