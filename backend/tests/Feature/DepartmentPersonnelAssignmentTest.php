<?php
namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\ComplaintUpdate;
use App\Models\Profile;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DepartmentPersonnelAssignmentTest extends TestCase
{
    protected string $headId = '11111111-1111-4111-8111-111111111111';
    protected string $personnelId = '22222222-2222-4222-8222-222222222222';
    protected string $otherPersonnelId = '33333333-3333-4333-8333-333333333333';
    protected string $inactivePersonnelId = '44444444-4444-4444-8444-444444444444';
    protected string $citizenId = '55555555-5555-4555-8555-555555555555';

    protected string $departmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    protected string $otherDepartmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    protected string $complaintId;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('complaint_updates');
        Schema::dropIfExists('complaint_assignments');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('profiles');
        Schema::dropIfExists('departments');
        Schema::dropIfExists('complaint_categories');
        Schema::dropIfExists('barangays');

        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email')->unique();
            $table->string('role');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id');
            $table->uuid('category_id')->nullable();
            $table->uuid('barangay_id')->nullable();
            $table->string('title');
            $table->text('description');
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
            $table->timestamp('assigned_at')->nullable();
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

        Profile::create([
            'id' => $this->headId,
            'full_name' => 'Department Head',
            'email' => 'head@example.com',
            'role' => 'Department_Head',
            'department_id' => $this->departmentId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->personnelId,
            'full_name' => 'Department Personnel',
            'email' => 'personnel@example.com',
            'role' => 'Department_Personnel',
            'department_id' => $this->departmentId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->otherPersonnelId,
            'full_name' => 'Other Department Personnel',
            'email' => 'other@example.com',
            'role' => 'Department_Personnel',
            'department_id' => $this->otherDepartmentId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->inactivePersonnelId,
            'full_name' => 'Inactive Personnel',
            'email' => 'inactive@example.com',
            'role' => 'Department_Personnel',
            'department_id' => $this->departmentId,
            'is_active' => false,
        ]);

        Profile::create([
            'id' => $this->citizenId,
            'full_name' => 'Citizen',
            'email' => 'citizen@example.com',
            'role' => 'citizen',
            'is_active' => true,
        ]);

        $complaint = Complaint::create([
            'citizen_id' => $this->citizenId,
            'title' => 'Damaged Road',
            'description' => 'There is a damaged road in the area.',
            'priority' => 'medium',
            'status' => 'in_progress',
            'resolution_level' => 'lgu',
        ]);

        $this->complaintId = $complaint->id;

        ComplaintAssignment::create([
            'complaint_id' => $this->complaintId,
            'assigned_to' => $this->headId,
            'assigned_by' => $this->headId,
            'assignment_level' => 'lgu',
            'department_id' => $this->departmentId,
            'notes' => 'Initial assignment to Department Head.',
            'assigned_at' => now(),
        ]);
    }

    private function authenticateAs(string $id, string $email): void
    {
        Http::fake([
            '*' => Http::response([
                'id' => $id,
                'email' => $email,
            ], 200),
        ]);

        $this->withToken('fake-test-token');
    }

    private function assignmentPayload(string $assignedTo): array
    {
        return [
            'assigned_to' => $assignedTo,
            'reason' => 'Assigning complaint for department handling.',
        ];
    }
    private function createAssignedComplaint(
        string $assignedTo,
        string $departmentId,
        ?string $endedAt = null
    ): string {
        $complaint = Complaint::create([
            'citizen_id' => $this->citizenId,
            'title' => 'Test Complaint',
            'description' => 'This is a test complaint.',
            'priority' => 'medium',
            'status' => 'in_progress',
            'resolution_level' => 'lgu',
        ]);

        ComplaintAssignment::create([
            'complaint_id' => $complaint->id,
            'assigned_to' => $assignedTo,
            'assigned_by' => $this->headId,
            'assignment_level' => 'lgu',
            'department_id' => $departmentId,
            'notes' => 'Test assignment.',
            'assigned_at' => now(),
            'ended_at' => $endedAt,
        ]);

        return $complaint->id;
    }

    public function test_department_head_can_assign_complaint_to_personnel(): void
    {
        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->postJson(
            "/api/department/complaints/{$this->complaintId}/assign",
            $this->assignmentPayload($this->personnelId)
        );

        $response->assertCreated()
            ->assertJsonPath('message', 'Complaint assigned to Department Personnel successfully.')
            ->assertJsonPath('assignment.assigned_to', $this->personnelId);

        $this->assertDatabaseHas('complaint_assignments', [
            'complaint_id' => $this->complaintId,
            'assigned_to' => $this->personnelId,
            'assigned_by' => $this->headId,
            'assignment_level' => 'lgu',
            'department_id' => $this->departmentId,
            'notes' => 'Assigning complaint for department handling.',
            'ended_at' => null,
        ]);

        $this->assertDatabaseHas('complaints', [
            'id' => $this->complaintId,
            'status' => 'assigned',
        ]);

        $this->assertDatabaseHas('complaint_updates', [
            'complaint_id' => $this->complaintId,
            'updated_by' => $this->headId,
            'old_status' => 'in_progress',
            'new_status' => 'assigned',
        ]);

        $this->assertDatabaseCount('complaint_assignments', 2);

        $this->assertNotNull(
            ComplaintAssignment::where('complaint_id', $this->complaintId)
                ->where('assigned_to', $this->headId)
                ->first()->ended_at
        );
    }

    public function test_department_head_cannot_assign_personnel_from_another_department(): void
    {
        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->postJson(
            "/api/department/complaints/{$this->complaintId}/assign",
            $this->assignmentPayload($this->otherPersonnelId)
        );

        $response->assertUnprocessable();

        $this->assertDatabaseCount('complaint_assignments', 1);
    }

    public function test_department_head_cannot_assign_inactive_personnel(): void
    {
        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->postJson(
            "/api/department/complaints/{$this->complaintId}/assign",
            $this->assignmentPayload($this->inactivePersonnelId)
        );

        $response->assertUnprocessable();

        $this->assertDatabaseCount('complaint_assignments', 1);
    }

    public function test_department_head_cannot_assign_same_personnel_twice(): void
    {
        $this->authenticateAs($this->headId, 'head@example.com');

        $payload = $this->assignmentPayload($this->personnelId);

        $firstResponse = $this->postJson(
            "/api/department/complaints/{$this->complaintId}/assign",
            $payload
        );

        $firstResponse->assertCreated();

        $secondResponse = $this->postJson(
            "/api/department/complaints/{$this->complaintId}/assign",
            $payload
        );

        $secondResponse->assertUnprocessable();

        $this->assertDatabaseCount('complaint_assignments', 2);
    }

    public function test_citizen_cannot_assign_complaint_to_personnel(): void
    {
        $this->authenticateAs($this->citizenId, 'citizen@example.com');

        $response = $this->postJson(
            "/api/department/complaints/{$this->complaintId}/assign",
            $this->assignmentPayload($this->personnelId)
        );

        $response->assertForbidden();

        $this->assertDatabaseCount('complaint_assignments', 1);
    }

    public function test_assignment_requires_a_valid_reason(): void
    {
        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->postJson(
            "/api/department/complaints/{$this->complaintId}/assign",
            [
                'assigned_to' => $this->personnelId,
                'reason' => 'Short',
            ]
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['reason']);

        $this->assertDatabaseCount('complaint_assignments', 1);
    }

    public function test_inactive_department_head_cannot_assign_complaint(): void
    {
        DB::table('profiles')
            ->where('id', $this->headId)
            ->update(['is_active' => false]);

        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->postJson(
            "/api/department/complaints/{$this->complaintId}/assign",
            $this->assignmentPayload($this->personnelId)
        );

        $response->assertForbidden();

        $this->assertDatabaseCount('complaint_assignments', 1);
    }

    public function test_department_head_cannot_assign_resolved_complaint(): void
    {
        DB::table('complaints')
            ->where('id', $this->complaintId)
            ->update(['status' => 'resolved']);

        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->postJson(
            "/api/department/complaints/{$this->complaintId}/assign",
            $this->assignmentPayload($this->personnelId)
        );

        $response->assertUnprocessable();

        $this->assertDatabaseCount('complaint_assignments', 1);
    }
    public function test_personnel_can_view_only_complaints_currently_assigned_to_them(): void
    {
        // Assign the existing complaint to this personnel.
        DB::table('complaint_assignments')
            ->where('complaint_id', $this->complaintId)
            ->update([
                'assigned_to' => $this->personnelId,
            ]);

        // Create a complaint assigned to another personnel.
        $otherComplaintId = $this->createAssignedComplaint(
            $this->otherPersonnelId,
            $this->otherDepartmentId
        );

        // Create a complaint whose assignment has already ended.
        $endedComplaintId = $this->createAssignedComplaint(
            $this->personnelId,
            $this->departmentId,
            now()
        );

        $this->authenticateAs($this->personnelId, 'personnel@example.com');

        $response = $this->getJson('/api/department/personnel/complaints');

        $response->assertOk()
            ->assertJsonPath(
                'message',
                'Department Personnel complaints retrieved successfully.'
            )
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->complaintId);

        $this->assertNotEquals($otherComplaintId, $this->complaintId);
        $this->assertNotEquals($endedComplaintId, $this->complaintId);
    }

    public function test_inactive_personnel_cannot_access_complaint_queue(): void
    {
        $this->authenticateAs(
            $this->inactivePersonnelId,
            'inactive@example.com'
        );

        $response = $this->getJson('/api/department/personnel/complaints');

        $response->assertForbidden();
    }

    public function test_citizen_cannot_access_department_personnel_queue(): void
    {
        $this->authenticateAs($this->citizenId, 'citizen@example.com');

        $response = $this->getJson('/api/department/personnel/complaints');

        $response->assertForbidden();
    }

    public function test_personnel_without_department_cannot_access_queue(): void
    {
        DB::table('profiles')
            ->where('id', $this->personnelId)
            ->update(['department_id' => null]);

        $this->authenticateAs($this->personnelId, 'personnel@example.com');

        $response = $this->getJson('/api/department/personnel/complaints');

        $response->assertUnprocessable();
    }
}
