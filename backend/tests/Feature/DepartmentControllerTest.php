<?php

namespace Tests\Feature;

use App\Services\SupabaseAdminService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DepartmentControllerTest extends TestCase
{
    private const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
    private const DEPARTMENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const STAFF_ID = '33333333-3333-4333-8333-333333333333';
    private const COMPLAINT_ID = '44444444-4444-4444-8444-444444444444';
    private const ASSIGNMENT_ID = '55555555-5555-4555-8555-555555555555';
    private const ESCALATION_ID = '66666666-6666-4666-8666-666666666666';
    private const DESTINATION_ESCALATION_ID = '77777777-7777-4777-8777-777777777777';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.publishable_key' => 'test-publishable-key',
        ]);

        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('description')->nullable();
            $table->timestamps();
        });
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->uuid('department_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
        });
        Schema::create('complaint_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('department_id')->nullable();
            $table->string('assignment_level');
            $table->timestamp('ended_at')->nullable();
        });
        Schema::create('complaint_escalations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('origin_department_id')->nullable();
            $table->uuid('destination_department_id')->nullable();
        });

        DB::table('departments')->insert([
            'id' => self::DEPARTMENT_ID,
            'name' => 'Engineering',
            'description' => 'Engineering department',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('profiles')->insert([
            'id' => self::ADMIN_ID,
            'full_name' => 'Test Administrator',
            'email' => 'admin@example.com',
            'role' => 'System Administrator',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fake([
            '*' => Http::response([
                'id' => self::ADMIN_ID,
                'email' => 'admin@example.com',
                'app_metadata' => [
                    SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
                ],
            ], 200),
        ]);
    }

    public function test_department_with_assigned_staff_cannot_be_deleted(): void
    {
        $this->createStaff();

        $this->deleteAsAdmin()
            ->assertConflict()
            ->assertJsonPath(
                'message',
                'Department cannot be deleted because staff members are assigned to it.'
            );

        $this->assertDatabaseHas('departments', ['id' => self::DEPARTMENT_ID]);
        $this->assertDatabaseHas('profiles', [
            'id' => self::STAFF_ID,
            'department_id' => self::DEPARTMENT_ID,
        ]);
    }

    public function test_department_with_associated_complaints_cannot_be_deleted(): void
    {
        $this->createComplaintAssignment();

        $this->deleteAsAdmin()
            ->assertConflict()
            ->assertJsonPath(
                'message',
                'Department cannot be deleted because existing complaints or complaint escalation records are associated with it.'
            );

        $this->assertDatabaseHas('departments', ['id' => self::DEPARTMENT_ID]);
        $this->assertDatabaseHas('complaints', ['id' => self::COMPLAINT_ID]);
        $this->assertDatabaseHas('complaint_assignments', [
            'id' => self::ASSIGNMENT_ID,
            'complaint_id' => self::COMPLAINT_ID,
            'department_id' => self::DEPARTMENT_ID,
        ]);
    }

    public function test_department_with_staff_and_complaints_cannot_be_deleted(): void
    {
        $this->createStaff();
        $this->createComplaintAssignment();

        $this->deleteAsAdmin()
            ->assertConflict()
            ->assertJsonPath(
                'message',
                'Department cannot be deleted because staff members are assigned to it and existing complaints or complaint escalation records are associated with it.'
            );

        $this->assertDatabaseHas('departments', ['id' => self::DEPARTMENT_ID]);
        $this->assertDatabaseHas('profiles', [
            'id' => self::STAFF_ID,
            'department_id' => self::DEPARTMENT_ID,
        ]);
        $this->assertDatabaseHas('complaint_assignments', [
            'id' => self::ASSIGNMENT_ID,
            'department_id' => self::DEPARTMENT_ID,
        ]);
    }

    public function test_department_with_complaint_escalation_reference_cannot_be_deleted(): void
    {
        DB::table('complaint_escalations')->insert([
            [
                'id' => self::ESCALATION_ID,
                'origin_department_id' => self::DEPARTMENT_ID,
                'destination_department_id' => null,
            ],
            [
                'id' => self::DESTINATION_ESCALATION_ID,
                'origin_department_id' => null,
                'destination_department_id' => self::DEPARTMENT_ID,
            ],
        ]);

        $this->deleteAsAdmin()
            ->assertConflict()
            ->assertJsonPath(
                'message',
                'Department cannot be deleted because existing complaints or complaint escalation records are associated with it.'
            );

        $this->assertDatabaseHas('departments', ['id' => self::DEPARTMENT_ID]);
        $this->assertDatabaseHas('complaint_escalations', [
            'id' => self::ESCALATION_ID,
            'origin_department_id' => self::DEPARTMENT_ID,
        ]);
        $this->assertDatabaseHas('complaint_escalations', [
            'id' => self::DESTINATION_ESCALATION_ID,
            'destination_department_id' => self::DEPARTMENT_ID,
        ]);
    }

    public function test_department_without_staff_or_complaints_can_be_deleted(): void
    {
        $this->deleteAsAdmin()
            ->assertOk()
            ->assertJsonPath('message', 'Department deleted successfully');

        $this->assertDatabaseMissing('departments', ['id' => self::DEPARTMENT_ID]);
    }

    public function test_department_deletion_keeps_existing_authorization_behavior(): void
    {
        $this->deleteJson('/api/departments/' . self::DEPARTMENT_ID)
            ->assertUnauthorized();

        DB::table('profiles')
            ->where('id', self::ADMIN_ID)
            ->update(['role' => 'citizen']);

        $this->deleteAsAdmin()->assertForbidden();

        $this->assertDatabaseHas('departments', ['id' => self::DEPARTMENT_ID]);
    }

    private function createStaff(): void
    {
        DB::table('profiles')->insert([
            'id' => self::STAFF_ID,
            'full_name' => 'Department Head',
            'email' => 'department-head@example.com',
            'role' => 'Department_Head',
            'department_id' => self::DEPARTMENT_ID,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createComplaintAssignment(): void
    {
        DB::table('complaints')->insert(['id' => self::COMPLAINT_ID]);
        DB::table('complaint_assignments')->insert([
            'id' => self::ASSIGNMENT_ID,
            'complaint_id' => self::COMPLAINT_ID,
            'department_id' => self::DEPARTMENT_ID,
            'assignment_level' => 'lgu',
            'ended_at' => now(),
        ]);
    }

    private function deleteAsAdmin()
    {
        return $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->deleteJson('/api/departments/' . self::DEPARTMENT_ID);
    }
}
