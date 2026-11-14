<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();

            // Sequential report reference: R000001, R000002, etc.
            $table->string('report_number', 20)->nullable()->unique();
            // Staff profile that generated the report.
            $table->foreignUuid('generated_by')
                ->constrained('profiles')
                ->restrictOnDelete();

            // Reporting period.
            $table->date('date_from');
            $table->date('date_to');

            // Supabase Storage PDF location.
            $table->text('file_path')->nullable();

            $table->timestamps();

            $table->index(['date_from', 'date_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
