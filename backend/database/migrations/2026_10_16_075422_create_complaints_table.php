
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('citizen_id');
            $table->uuid('category_id');
            $table->uuid('barangay_id');

            $table->string('title');
            $table->text('description');

            // low, medium, high, urgent
            $table->string('priority')->default('medium');

            // Initial complaint status
            $table->string('status')->default('submitted');

            // barangay or lgu decided during review
            $table->string('resolution_level')->nullable();

            $table->text('rejection_reason')->nullable();

            $table->timestamps();

            $table->foreign('citizen_id')
                ->references('id')
                ->on('profiles')
                ->restrictOnDelete();

            $table->foreign('category_id')
                ->references('id')
                ->on('complaint_categories')
                ->restrictOnDelete();

            $table->foreign('barangay_id')
                ->references('id')
                ->on('barangays')
                ->restrictOnDelete();

            $table->index('citizen_id');
            $table->index('category_id');
            $table->index('barangay_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
