
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // One feedback record per complaint
            $table->uuid('complaint_id')->unique();
            $table->uuid('citizen_id');

            // Valid rating: 1 to 5 (enforce in API and database)
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();

            $table->timestamps();

            $table->foreign('complaint_id')
                ->references('id')
                ->on('complaints')
                ->cascadeOnDelete();

            $table->foreign('citizen_id')
                ->references('id')
                ->on('profiles')
                ->restrictOnDelete();

            $table->index('citizen_id');
            
        });
        DB::statement("
    ALTER TABLE feedback
    ADD CONSTRAINT feedback_rating_check
    CHECK (rating BETWEEN 1 AND 5)
");
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback');
    }
};
