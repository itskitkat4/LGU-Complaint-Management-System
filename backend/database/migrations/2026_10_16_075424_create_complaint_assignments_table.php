
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('complaint_id');
            $table->uuid('assigned_to');
            $table->uuid('assigned_by');

            // barangay or lgu
            $table->string('assignment_level');

            $table->text('notes')->nullable();

            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();

            $table->timestamps();

            $table->foreign('complaint_id')
                ->references('id')
                ->on('complaints')
                ->cascadeOnDelete();

            $table->foreign('assigned_to')
                ->references('id')
                ->on('profiles')
                ->restrictOnDelete();

            $table->foreign('assigned_by')
                ->references('id')
                ->on('profiles')
                ->restrictOnDelete();

            $table->index(['complaint_id', 'assigned_at']);
            $table->index(['assigned_to', 'ended_at']);
            $table->index('assignment_level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_assignments');
    }
};
