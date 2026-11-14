<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $mismatchedComplaints = DB::table('complaint_attachments as a')
            ->join('complaint_resolutions as r', 'r.id', '=', 'a.resolution_id')
            ->whereNotNull('a.resolution_id')
            ->whereColumn('a.complaint_id', '<>', 'r.complaint_id')
            ->exists();

        if ($mismatchedComplaints) {
            throw new RuntimeException(
                'Cannot separate resolution evidence: attachment rows link a resolution to a different complaint. Review those rows before retrying this migration.'
            );
        }

        Schema::create('complaint_resolution_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('resolution_id');
            $table->uuid('uploaded_by');
            $table->string('file_path');
            $table->string('file_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('resolution_id')
                ->references('id')
                ->on('complaint_resolutions')
                ->cascadeOnDelete();
            $table->foreign('uploaded_by')
                ->references('id')
                ->on('profiles')
                ->restrictOnDelete();

            $table->index(['resolution_id', 'created_at']);
            $table->index('uploaded_by');
        });

        DB::statement(<<<'SQL'
            INSERT INTO complaint_resolution_attachments
                (id, resolution_id, uploaded_by, file_path, file_name, mime_type, file_size, created_at)
            SELECT id, resolution_id, uploaded_by, file_path, file_name, mime_type, file_size, created_at
            FROM complaint_attachments
            WHERE resolution_id IS NOT NULL
        SQL);

        DB::statement('DELETE FROM complaint_attachments WHERE resolution_id IS NOT NULL');

        Schema::table('complaint_attachments', function (Blueprint $table) {
            $table->dropForeign(['resolution_id']);
            $table->dropIndex(['resolution_id']);
            $table->dropColumn('resolution_id');
        });
    }

    public function down(): void
    {
        Schema::table('complaint_attachments', function (Blueprint $table) {
            $table->uuid('resolution_id')->nullable();
        });

        DB::statement(<<<'SQL'
            INSERT INTO complaint_attachments
                (id, complaint_id, uploaded_by, file_path, file_name, mime_type, file_size, created_at, resolution_id)
            SELECT a.id, r.complaint_id, a.uploaded_by, a.file_path, a.file_name, a.mime_type, a.file_size, a.created_at, a.resolution_id
            FROM complaint_resolution_attachments AS a
            JOIN complaint_resolutions AS r ON r.id = a.resolution_id
        SQL);

        Schema::table('complaint_attachments', function (Blueprint $table) {
            $table->foreign('resolution_id')
                ->references('id')
                ->on('complaint_resolutions')
                ->nullOnDelete();
            $table->index('resolution_id');
        });

        Schema::dropIfExists('complaint_resolution_attachments');
    }
};
