<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const INDEX_NAME =
        'profiles_one_active_barangay_head_per_barangay_unique';

    public function up(): void
    {
        DB::statement("
            CREATE UNIQUE INDEX " . self::INDEX_NAME . "
            ON profiles (barangay_id)
            WHERE role = 'Barangay_Head'
            AND is_active = TRUE
            AND barangay_id IS NOT NULL
        ");
    }

    public function down(): void
    {
        DB::statement(
            'DROP INDEX IF EXISTS ' . self::INDEX_NAME
        );
    }
};