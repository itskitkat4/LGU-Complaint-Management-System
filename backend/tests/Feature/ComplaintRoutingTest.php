<?php
namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\ComplaintUpdate;
use App\Models\Profile;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ComplaintRoutingTest extends TestCase
{
    private string $staffId = '11111111-1111-4111-8111-111111111111';
    private string $barangayHeadId = '22222222-2222-4222-8222-222222222222';
    private string $wrongBarangayHeadId = '33333333-3333-4333-8333-333333333333';
    private string $departmentHeadId = '44444444-4444-4444-8444-444444444444';
    private string $wrongDepartmentHeadId = '55555555-5555-4555-8555-555555555555';

    private string $barangayId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private string $otherBarangayId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    private string $departmentId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    private string $otherDepartmentId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

    private string $staffEmail = 'staff@example.com';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('complaint_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('barangays', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('complaint_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();
        });

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

        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id')->nullable();
            $table->uuid('category_id')->nullable();
            $table->uuid('barangay_id')->nullable();
            $table->boolean('is_anonymous')->default(false);
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('priority')->default('medium');
            $table->string('status')->default('submitted');
            $table->string('resolution_level')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('complaint_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('assigned_to');
            $table->uuid('assigned_by');
            $table->string('assignment_level');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('assigned_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
        });

        Schema::create('complaint_updates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('updated_by');
            $table->string('old_status')->nullable();
            $table->string('new_status')->nullable();
            $table->text('comment')->nullable();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('profile_id');
            $table->uuid('complaint_id')->nullable();
            $table->string('title');
            $table->text('message');
            $table->string('type', 50);
            $table->boolean('is_read')->default(false);
            $table->timestampTz('read_at')->nullable();
            $table->timestamps();

            $table->index(['profile_id', 'is_read']);
            $table->index(['profile_id', 'created_at']);
        });

        Profile::create([
            'id' => $this->staffId,
            'full_name' => 'Test LGU Staff',
            'email' => $this->staffEmail,
            'role' => 'LGU-Staff',
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->barangayHeadId,
            'full_name' => 'Barangay Head One',
            'email' => 'barangay1@example.com',
            'role' => 'Barangay_Head',
            'barangay_id' => $this->barangayId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->wrongBarangayHeadId,
            'full_name' => 'Barangay Head Two',
            'email' => 'barangay2@example.com',
            'role' => 'Barangay_Head',
            'barangay_id' => $this->otherBarangayId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->departmentHeadId,
            'full_name' => 'Department Head One',
            'email' => 'department1@example.com',
            'role' => 'Department_Head',
            'department_id' => $this->departmentId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->wrongDepartmentHeadId,
            'full_name' => 'Department Head Two',
            'email' => 'department2@example.com',
            'role' => 'Department_Head',
            'department_id' => $this->otherDepartmentId,
            'is_active' => true,
        ]);

        DB::table('departments')->insert([
            [
                'id' => $this->departmentId,
                'name' => 'Engineering Department',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $this->otherDepartmentId,
                'name' => 'Health Department',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
    private function authenticateAs(string $profileId, string $email): void
    {
        Http::fake([
            '*' => Http::response([
                'id' => $profileId,
                'email' => $email,
                'app_metadata' => ['bantayserbisyo_password_setup_completed' => true],
            ], 200),
        ]);

        $this->withToken($this->syntheticSupabaseToken($profileId, ['password']));
    }

    private function createComplaint(string $level): Complaint
    {
        return Complaint::create([
            'title' => 'Test complaint',
            'description' => 'This complaint is created for routing tests.',
            'priority' => 'medium',
            'status' => 'accepted',
            'resolution_level' => $level,
            'barangay_id' => $this->barangayId,
        ]);
    }

    public function test_lgu_staff_complaint_history_redacts_anonymous_identity(): void
    {
        $complaint = $this->createComplaint('lgu');
        $complaint->update([
            'status' => 'resolved',
            'citizen_id' => '66666666-6666-4666-8666-666666666666',
        ]);
        DB::table('complaints')->where('id', $complaint->id)->update(['is_anonymous' => true]);

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->getJson('/api/staff/complaints/history');

        $response->assertOk()
            ->assertJsonPath('data.0.id', $complaint->id)
            ->assertJsonPath('data.0.is_anonymous', true)
            ->assertJsonMissingPath('data.0.citizen_id')
            ->assertJsonMissingPath('data.0.citizen');
    }

    public function test_lgu_staff_complaint_queue_redacts_anonymous_identity(): void
    {
        $complaint = $this->createComplaint('lgu');
        $complaint->update([
            'citizen_id' => '66666666-6666-4666-8666-666666666666',
        ]);
        DB::table('complaints')->where('id', $complaint->id)->update(['is_anonymous' => true]);

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->getJson('/api/staff/complaints');

        $response->assertOk()
            ->assertJsonPath('data.0.id', $complaint->id)
            ->assertJsonPath('data.0.is_anonymous', true)
            ->assertJsonMissingPath('data.0.citizen_id')
            ->assertJsonMissingPath('data.0.citizen');
    }

    public function test_lgu_staff_complaint_detail_redacts_anonymous_identity(): void
    {
        $complaint = $this->createComplaint('lgu');
        $complaint->update([
            'citizen_id' => '66666666-6666-4666-8666-666666666666',
        ]);
        DB::table('complaints')->where('id', $complaint->id)->update(['is_anonymous' => true]);

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->getJson("/api/staff/complaints/{$complaint->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $complaint->id)
            ->assertJsonPath('data.is_anonymous', true)
            ->assertJsonMissingPath('data.citizen_id')
            ->assertJsonMissingPath('data.citizen');
    }

    public function test_lgu_staff_can_route_complaint_to_correct_barangay_head(): void
    {
        $complaint = $this->createComplaint('barangay');

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->postJson(
            "/api/staff/complaints/{$complaint->id}/route",
            [
                'assigned_to' => $this->barangayHeadId,
                'reason' => 'This complaint belongs to the concerned barangay.',
            ]
        );

        $response->assertCreated();

        $this->assertDatabaseHas('complaint_assignments', [
            'complaint_id' => $complaint->id,
            'assigned_to' => $this->barangayHeadId,
            'assigned_by' => $this->staffId,
            'assignment_level' => 'barangay',
            'barangay_id' => $this->barangayId,
            'department_id' => null,
        ]);

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'assigned',
            'resolution_level' => 'barangay',
        ]);

        $this->assertDatabaseHas('complaint_updates', [
            'complaint_id' => $complaint->id,
            'updated_by' => $this->staffId,
            'new_status' => 'assigned',
        ]);
    }

    public function test_lgu_staff_can_route_complaint_to_correct_department_head(): void
    {
        $complaint = $this->createComplaint('lgu');

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->postJson(
            "/api/staff/complaints/{$complaint->id}/route",
            [
                'assigned_to' => $this->departmentHeadId,
                'department_id' => $this->departmentId,
                'reason' => 'This complaint requires the engineering department.',
            ]
        );

        $response->assertCreated();

        $this->assertDatabaseHas('complaint_assignments', [
            'complaint_id' => $complaint->id,
            'assigned_to' => $this->departmentHeadId,
            'assigned_by' => $this->staffId,
            'assignment_level' => 'lgu',
            'barangay_id' => null,
            'department_id' => $this->departmentId,
        ]);

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'assigned',
            'resolution_level' => 'lgu',
        ]);
    }

    public function test_barangay_complaint_cannot_be_routed_to_wrong_barangay_head(): void
    {
        $complaint = $this->createComplaint('barangay');

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->postJson(
            "/api/staff/complaints/{$complaint->id}/route",
            [
                'assigned_to' => $this->wrongBarangayHeadId,
                'reason' => 'Attempting to route to another barangay.',
            ]
        );

        $response->assertUnprocessable();

        $this->assertDatabaseMissing('complaint_assignments', [
            'complaint_id' => $complaint->id,
        ]);
    }

    public function test_lgu_complaint_cannot_be_routed_to_wrong_department_head(): void
    {
        $complaint = $this->createComplaint('lgu');

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->postJson(
            "/api/staff/complaints/{$complaint->id}/route",
            [
                'assigned_to' => $this->wrongDepartmentHeadId,
                'department_id' => $this->departmentId,
                'reason' => 'Attempting to route to the wrong department.',
            ]
        );

        $response->assertUnprocessable();

        $this->assertDatabaseMissing('complaint_assignments', [
            'complaint_id' => $complaint->id,
        ]);
    }

    public function test_routing_requires_a_valid_reason(): void
    {
        $complaint = $this->createComplaint('barangay');

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->postJson(
            "/api/staff/complaints/{$complaint->id}/route",
            [
                'assigned_to' => $this->barangayHeadId,
                'reason' => 'Short',
            ]
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['reason']);

        $this->assertDatabaseMissing('complaint_assignments', [
            'complaint_id' => $complaint->id,
        ]);
    }

    public function test_citizen_cannot_route_complaints(): void
    {
        $complaint = $this->createComplaint('barangay');

        $citizenId = '66666666-6666-4666-8666-666666666666';

        Profile::create([
            'id' => $citizenId,
            'full_name' => 'Test Citizen',
            'email' => 'citizen@example.com',
            'role' => 'citizen',
            'is_active' => true,
        ]);

        $this->authenticateAs($citizenId, 'citizen@example.com');

        $response = $this->postJson(
            "/api/staff/complaints/{$complaint->id}/route",
            [
                'assigned_to' => $this->barangayHeadId,
                'reason' => 'Unauthorized routing attempt.',
            ]
        );

        $response->assertForbidden();

        $this->assertDatabaseMissing('complaint_assignments', [
            'complaint_id' => $complaint->id,
        ]);
    }

    public function test_routing_ends_previous_active_assignment(): void
    {
        $complaint = $this->createComplaint('barangay');

        $oldAssignment = ComplaintAssignment::create([
            'complaint_id' => $complaint->id,
            'assigned_to' => $this->wrongBarangayHeadId,
            'assigned_by' => $this->staffId,
            'assignment_level' => 'barangay',
            'barangay_id' => $this->barangayId,
            'notes' => 'Previous assignment.',
            'assigned_at' => now()->subDay(),
        ]);

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->postJson(
            "/api/staff/complaints/{$complaint->id}/route",
            [
                'assigned_to' => $this->barangayHeadId,
                'reason' => 'Reassigning complaint to the correct barangay head.',
            ]
        );

        $response->assertCreated();

        $this->assertDatabaseMissing('complaint_assignments', [
            'id' => $oldAssignment->id,
            'ended_at' => null,
        ]);

        $this->assertDatabaseHas('complaint_assignments', [
            'complaint_id' => $complaint->id,
            'assigned_to' => $this->barangayHeadId,
            'ended_at' => null,
        ]);
    }
    public function test_inactive_assignee_cannot_receive_complaint(): void
    {
        $complaint = $this->createComplaint('barangay');

        Profile::where('id', $this->barangayHeadId)
            ->update(['is_active' => false]);

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->postJson(
            "/api/staff/complaints/{$complaint->id}/route",
            [
                'assigned_to' => $this->barangayHeadId,
                'reason' => 'Attempting to assign to an inactive staff account.',
            ]
        );

        $response->assertUnprocessable();

        $this->assertDatabaseMissing('complaint_assignments', [
            'complaint_id' => $complaint->id,
        ]);
    }
    public function test_duplicate_active_assignment_is_rejected(): void
    {
        $complaint = $this->createComplaint('barangay');

        ComplaintAssignment::create([
            'complaint_id' => $complaint->id,
            'assigned_to' => $this->barangayHeadId,
            'assigned_by' => $this->staffId,
            'assignment_level' => 'barangay',
            'barangay_id' => $this->barangayId,
            'notes' => 'Existing assignment.',
            'assigned_at' => now(),
        ]);

        $this->authenticateAs($this->staffId, $this->staffEmail);

        $response = $this->postJson(
            "/api/staff/complaints/{$complaint->id}/route",
            [
                'assigned_to' => $this->barangayHeadId,
                'reason' => 'Trying to assign the same complaint again.',
            ]
        );

        $response->assertUnprocessable();

        $this->assertDatabaseCount('complaint_assignments', 1);
    }
}
