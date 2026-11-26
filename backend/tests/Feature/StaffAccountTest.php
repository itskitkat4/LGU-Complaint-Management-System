<?php
namespace Tests\Feature;

use App\Models\Profile;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StaffAccountTest extends TestCase
{
    public function test_staff_account_creation_requires_authentication(): void
    {
        $response = $this->postJson('/api/staff-accounts', []);

        $response->assertUnauthorized();
    }

    public function test_citizen_cannot_create_staff_accounts(): void
    {
        // Create a temporary profiles table for this test.
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Profile::create([
            'id' => '11111111-1111-4111-8111-111111111111',
            'full_name' => 'Test Citizen',
            'email' => 'citizen@example.com',
            'role' => 'citizen',
            'is_active' => true,
        ]);

        Http::fake([
            '*' => Http::response([
                'id' => '11111111-1111-4111-8111-111111111111',
                'email' => 'citizen@example.com',
            ], 200),
        ]);

        $response = $this->withToken($this->syntheticSupabaseToken(
            '11111111-1111-4111-8111-111111111111',
            ['oauth']
        ))
            ->postJson('/api/staff-accounts', []);

        $response->assertForbidden();
    }

    public function test_admin_cannot_create_staff_account_with_invalid_role(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Profile::create([
            'id' => '22222222-2222-4222-8222-222222222222',
            'full_name' => 'Test Administrator',
            'email' => 'admin@example.com',
            'role' => 'System Administrator',
            'is_active' => true,
        ]);

        Http::fake([
            '*' => Http::response([
                'id' => '22222222-2222-4222-8222-222222222222',
                'email' => 'admin@example.com',
            ], 200),
        ]);

        $response = $this->withToken($this->syntheticSupabaseToken(
            '22222222-2222-4222-8222-222222222222',
            ['password']
        ))
            ->postJson('/api/staff-accounts', [
                'full_name' => 'Test Citizen',
                'email' => 'newcitizen@example.com',
                'role' => 'citizen',
            ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['role']);
    }

    public function test_staff_roles_require_correct_assignments(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Profile::create([
            'id' => '22222222-2222-4222-8222-222222222222',
            'full_name' => 'Test Administrator',
            'email' => 'admin@example.com',
            'role' => 'System Administrator',
            'is_active' => true,
        ]);

        Http::fake([
            '*' => Http::response([
                'id' => '22222222-2222-4222-8222-222222222222',
                'email' => 'admin@example.com',
            ], 200),
        ]);

        // Barangay Head must have a barangay assignment.
        $barangayResponse = $this->withToken($this->syntheticSupabaseToken(
            '22222222-2222-4222-8222-222222222222',
            ['password']
        ))
            ->postJson('/api/staff-accounts', [
                'full_name' => 'Test Barangay Head',
                'email' => 'barangayhead@example.com',
                'role' => 'Barangay_Head',
            ]);

        $barangayResponse->assertUnprocessable();

        // Department Head must have a department assignment.
        $departmentResponse = $this->withToken($this->syntheticSupabaseToken(
            '22222222-2222-4222-8222-222222222222',
            ['password']
        ))
            ->postJson('/api/staff-accounts', [
                'full_name' => 'Test Department Head',
                'email' => 'departmenthead@example.com',
                'role' => 'Department_Head',
            ]);

        $departmentResponse->assertUnprocessable();
    }

    public function test_department_personnel_requires_department_assignment(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Profile::create([
            'id' => '22222222-2222-4222-8222-222222222222',
            'full_name' => 'Test Administrator',
            'email' => 'admin@example.com',
            'role' => 'System Administrator',
            'is_active' => true,
        ]);

        Http::fake([
            '*' => Http::response([
                'id' => '22222222-2222-4222-8222-222222222222',
                'email' => 'admin@example.com',
            ], 200),
        ]);

        $response = $this->withToken($this->syntheticSupabaseToken(
            '22222222-2222-4222-8222-222222222222',
            ['password']
        ))
            ->postJson('/api/staff-accounts', [
                'full_name' => 'Test Personnel',
                'email' => 'personnel@example.com',
                'role' => 'Department_Personnel',
            ]);

        $response->assertUnprocessable();
    }
    public function test_admin_can_deactivate_staff_account(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $adminId = '22222222-2222-4222-8222-222222222222';
        $staffId = '33333333-3333-4333-8333-333333333333';

        Profile::create([
            'id' => $adminId,
            'full_name' => 'Test Administrator',
            'email' => 'admin@example.com',
            'role' => 'System Administrator',
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $staffId,
            'full_name' => 'Test LGU Staff',
            'email' => 'staff@example.com',
            'role' => 'LGU-Staff',
            'is_active' => true,
        ]);

        Http::fake([
            '*' => Http::response([
                'id' => $adminId,
                'email' => 'admin@example.com',
            ], 200),
        ]);

        $response = $this->withToken($this->syntheticSupabaseToken(
            '22222222-2222-4222-8222-222222222222',
            ['password']
        ))
            ->patchJson("/api/staff-accounts/{$staffId}/deactivate");

        $response->assertOk();

        $this->assertDatabaseHas('profiles', [
            'id' => $staffId,
            'is_active' => false,
        ]);
    }
    public function test_citizen_cannot_deactivate_staff_account(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $citizenId = '11111111-1111-4111-8111-111111111111';
        $staffId = '33333333-3333-4333-8333-333333333333';

        Profile::create([
            'id' => $citizenId,
            'full_name' => 'Test Citizen',
            'email' => 'citizen@example.com',
            'role' => 'citizen',
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $staffId,
            'full_name' => 'Test LGU Staff',
            'email' => 'staff@example.com',
            'role' => 'LGU-Staff',
            'is_active' => true,
        ]);

        Http::fake([
            '*' => Http::response([
                'id' => $citizenId,
                'email' => 'citizen@example.com',
            ], 200),
        ]);

        $response = $this->withToken($this->syntheticSupabaseToken($citizenId, ['oauth']))
            ->patchJson("/api/staff-accounts/{$staffId}/deactivate");

        $response->assertForbidden();

        $this->assertDatabaseHas('profiles', [
            'id' => $staffId,
            'is_active' => true,
        ]);
    }
    public function test_system_administrator_account_cannot_be_deactivated(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $adminId = '22222222-2222-4222-8222-222222222222';

        Profile::create([
            'id' => $adminId,
            'full_name' => 'Test Administrator',
            'email' => 'admin@example.com',
            'role' => 'System Administrator',
            'is_active' => true,
        ]);

        Http::fake([
            '*' => Http::response([
                'id' => $adminId,
                'email' => 'admin@example.com',
            ], 200),
        ]);

        $response = $this->withToken($this->syntheticSupabaseToken($adminId, ['password']))
            ->patchJson("/api/staff-accounts/{$adminId}/deactivate");

        $response->assertForbidden();

        $this->assertDatabaseHas('profiles', [
            'id' => $adminId,
            'is_active' => true,
        ]);
    }

}
