
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('full_name');
            $table->string('email')->unique();
            $table->string('role');

            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();

            $table->timestamps();

            $table->foreign('barangay_id')
                ->references('id')
                ->on('barangays')
                ->nullOnDelete();

            $table->foreign('department_id')
                ->references('id')
                ->on('departments')
                ->nullOnDelete();

            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
