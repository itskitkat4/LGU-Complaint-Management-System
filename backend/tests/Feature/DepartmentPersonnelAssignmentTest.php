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

        Schema::dropIfExists('complaint_escalations');
        Schema::dropIfExists('complaint_updates');
        Schema::dropIfExists('complaint_attachments');
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
            $table->boolean('is_anonymous')->default(false);
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

        Schema::create('complaint_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->string('evidence_type')->default('supporting');
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();
        });

        Schema::create('complaint_escalations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->string('escalation_type');
            $table->uuid('requested_by');
            $table->uuid('origin_barangay_id')->nullable();
            $table->uuid('origin_department_id')->nullable();
            $table->uuid('destination_department_id')->nullable();
            $table->string('higher_authority_office')->nullable();
            $table->text('reason');
            $table->string('status')->default('pending');
            $table->uuid('reviewed_by')->nullable();
            $table->text('review_comment')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('outcome_notes')->nullable();
            $table->uuid('outcome_recorded_by')->nullable();
            $table->timestamp('outcome_recorded_at')->nullable();
            $table->timestamps();
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
            '*' => function ($request) {
                $authorization = $request->header('Authorization');
                $authorization = is_array($authorization) ? ($authorization[0] ?? '') : $authorization;
                $subject = $this->syntheticSupabaseSubject($authorization);

                return Http::response([
                    'id' => $subject,
                    'email' => $subject . '@example.com',
                    'app_metadata' => ['bantayserbisyo_password_setup_completed' => true],
                ], 200);
            },
        ]);

        $this->withToken($this->syntheticSupabaseToken($id, ['password']));
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

    public function test_department_head_complaint_queue_redacts_anonymous_identity(): void
    {
        DB::table('complaints')
            ->where('id', $this->complaintId)
            ->update(['is_anonymous' => true]);

        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->getJson('/api/department/complaints');

        $response->assertOk()
            ->assertJsonPath('data.0.id', $this->complaintId)
            ->assertJsonPath('data.0.is_anonymous', true)
            ->assertJsonMissingPath('data.0.citizen_id')
            ->assertJsonMissingPath('data.0.citizen');
    }

    public function test_department_head_monitoring_redacts_anonymous_identity(): void
    {
        DB::table('complaints')
            ->where('id', $this->complaintId)
            ->update(['is_anonymous' => true]);

        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->getJson('/api/department/monitoring');

        $response->assertOk()
            ->assertJsonPath('data.0.id', $this->complaintId)
            ->assertJsonPath('data.0.is_anonymous', true)
            ->assertJsonMissingPath('data.0.citizen_id')
            ->assertJsonMissingPath('data.0.citizen');
    }

    public function test_department_personnel_complaint_queue_redacts_anonymous_identity(): void
    {
        DB::table('complaint_assignments')
            ->where('complaint_id', $this->complaintId)
            ->update(['assigned_to' => $this->personnelId]);
        DB::table('complaints')
            ->where('id', $this->complaintId)
            ->update(['is_anonymous' => true]);

        $this->authenticateAs($this->personnelId, 'personnel@example.com');

        $response = $this->getJson('/api/department/personnel/complaints');

        $response->assertOk()
            ->assertJsonPath('data.0.id', $this->complaintId)
            ->assertJsonPath('data.0.is_anonymous', true)
            ->assertJsonMissingPath('data.0.citizen_id')
            ->assertJsonMissingPath('data.0.citizen');
    }

    public function test_department_personnel_complaint_detail_redacts_anonymous_identity(): void
    {
        DB::table('complaint_assignments')
            ->where('complaint_id', $this->complaintId)
            ->update(['assigned_to' => $this->personnelId]);
        DB::table('complaints')
            ->where('id', $this->complaintId)
            ->update(['is_anonymous' => true]);

        $this->authenticateAs($this->personnelId, 'personnel@example.com');

        $response = $this->getJson("/api/department/personnel/complaints/{$this->complaintId}");

        $response->assertOk()
            ->assertJsonPath('data.id', $this->complaintId)
            ->assertJsonPath('data.is_anonymous', true)
            ->assertJsonMissingPath('data.citizen_id')
            ->assertJsonMissingPath('data.citizen');
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

    public function test_personnel_can_start_work_on_their_active_assignment(): void
    {
        DB::table('complaints')
            ->where('id', $this->complaintId)
            ->update(['status' => 'assigned']);
        DB::table('complaint_assignments')
            ->where('complaint_id', $this->complaintId)
            ->update(['assigned_to' => $this->personnelId]);

        $this->authenticateAs($this->personnelId, 'personnel@example.com');

        $response = $this->postJson(
            "/api/department/personnel/complaints/{$this->complaintId}/start"
        );

        $response->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertDatabaseHas('complaints', [
            'id' => $this->complaintId,
            'status' => 'in_progress',
        ]);
        $this->assertDatabaseHas('complaint_updates', [
            'complaint_id' => $this->complaintId,
            'updated_by' => $this->personnelId,
            'old_status' => 'assigned',
            'new_status' => 'in_progress',
        ]);
    }

    public function test_personnel_cannot_start_work_after_their_assignment_has_ended(): void
    {
        DB::table('complaints')
            ->where('id', $this->complaintId)
            ->update(['status' => 'assigned']);
        DB::table('complaint_assignments')
            ->where('complaint_id', $this->complaintId)
            ->update([
                'assigned_to' => $this->personnelId,
                'ended_at' => now(),
            ]);

        $this->authenticateAs($this->personnelId, 'personnel@example.com');

        $response = $this->postJson(
            "/api/department/personnel/complaints/{$this->complaintId}/start"
        );

        $response->assertForbidden();

        $this->assertDatabaseHas('complaints', [
            'id' => $this->complaintId,
            'status' => 'assigned',
        ]);
        $this->assertDatabaseCount('complaint_updates', 0);
    }

    public function test_department_head_monitoring_is_scoped_and_includes_statuses_handlers_and_escalations(): void
    {
        $departmentComplaintId = $this->createAssignedComplaint(
            $this->personnelId,
            $this->departmentId
        );
        DB::table('complaints')
            ->where('id', $departmentComplaintId)
            ->update(['status' => 'assigned']);

        $otherDepartmentComplaintId = $this->createAssignedComplaint(
            $this->otherPersonnelId,
            $this->otherDepartmentId
        );
        $endedAssignmentComplaintId = $this->createAssignedComplaint(
            $this->personnelId,
            $this->departmentId,
            now()
        );

        DB::table('complaint_escalations')->insert([
            'id' => '66666666-6666-4666-8666-666666666666',
            'complaint_id' => $this->complaintId,
            'escalation_type' => 'department_to_higher_authority',
            'requested_by' => $this->headId,
            'origin_department_id' => $this->departmentId,
            'higher_authority_office' => 'Regional Office',
            'reason' => 'Requires regional review.',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('complaint_escalations')->insert([
            'id' => '77777777-7777-4777-8777-777777777777',
            'complaint_id' => $this->complaintId,
            'escalation_type' => 'barangay_to_department',
            'requested_by' => $this->headId,
            'origin_barangay_id' => '88888888-8888-4888-8888-888888888888',
            'destination_department_id' => $this->departmentId,
            'reason' => 'Barangay escalation review.',
            'status' => 'accepted',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->getJson(
            "/api/department/monitoring?department_id={$this->otherDepartmentId}"
        );

        $response->assertOk()
            ->assertJsonPath('message', 'Department monitoring data retrieved successfully.')
            ->assertJsonPath('status_counts.assigned', 1)
            ->assertJsonPath('status_counts.in_progress', 1)
            ->assertJsonPath('status_counts.submitted', 0)
            ->assertJsonPath('assignment_counts.awaiting_assignment', 0)
            ->assertJsonPath('pagination.total', 2)
            ->assertJsonPath('pagination.current_page', 1);

        $records = collect($response->json('data'))->keyBy('id')->all();
        $this->assertCount(2, $records);
        $this->assertArrayHasKey($this->complaintId, $records);
        $this->assertArrayHasKey($departmentComplaintId, $records);
        $this->assertArrayNotHasKey($otherDepartmentComplaintId, $records);
        $this->assertArrayNotHasKey($endedAssignmentComplaintId, $records);
        $this->assertSame(
            $this->departmentId,
            $records[$departmentComplaintId]['active_assignment']['department_id']
        );
        $this->assertSame(
            $this->personnelId,
            $records[$departmentComplaintId]['active_assignment']['assignee']['id']
        );
        $this->assertCount(1, $records[$this->complaintId]['escalations']);
        $this->assertSame(
            'department_to_higher_authority',
            $records[$this->complaintId]['escalations'][0]['escalation_type']
        );
    }

    public function test_department_head_monitoring_requires_authentication_and_department_head_role(): void
    {
        $this->getJson('/api/department/monitoring')->assertUnauthorized();

        $this->authenticateAs($this->citizenId, 'citizen@example.com');
        $this->getJson('/api/department/monitoring')->assertForbidden();

        $this->authenticateAs($this->personnelId, 'personnel@example.com');
        $this->getJson('/api/department/monitoring')->assertForbidden();
    }

    public function test_department_head_monitoring_paginates_department_complaints(): void
    {
        for ($index = 0; $index < 10; $index++) {
            $this->createAssignedComplaint($this->personnelId, $this->departmentId);
        }

        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->getJson('/api/department/monitoring?page=2');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('pagination.current_page', 2)
            ->assertJsonPath('pagination.last_page', 2)
            ->assertJsonPath('pagination.per_page', 10)
            ->assertJsonPath('pagination.total', 11);
    }

    public function test_department_head_awaiting_assignment_counts_only_active_complaints_still_assigned_to_the_head(): void
    {
        $headComplaint = $this->createAssignedComplaint(
            $this->headId,
            $this->departmentId
        );
        DB::table('complaints')
            ->where('id', $headComplaint)
            ->update(['status' => 'assigned']);

        $personnelComplaint = $this->createAssignedComplaint(
            $this->personnelId,
            $this->departmentId
        );
        DB::table('complaints')
            ->where('id', $personnelComplaint)
            ->update(['status' => 'assigned']);

        $endedHeadAssignment = $this->createAssignedComplaint(
            $this->headId,
            $this->departmentId,
            now()
        );
        DB::table('complaints')
            ->where('id', $endedHeadAssignment)
            ->update(['status' => 'assigned']);

        $this->authenticateAs($this->headId, 'head@example.com');

        $this->getJson('/api/department/monitoring')
            ->assertOk()
            ->assertJsonPath('status_counts.assigned', 2)
            ->assertJsonPath('assignment_counts.awaiting_assignment', 1);
    }

    public function test_department_head_monitoring_returns_empty_counts_for_a_department_without_active_assignments(): void
    {
        Profile::whereKey($this->headId)
            ->update(['department_id' => $this->otherDepartmentId]);

        $this->authenticateAs($this->headId, 'head@example.com');

        $response = $this->getJson('/api/department/monitoring');

        $response->assertOk()
            ->assertExactJson([
                'message' => 'Department monitoring data retrieved successfully.',
                'data' => [],
                'status_counts' => [
                    'submitted' => 0,
                    'under_review' => 0,
                    'accepted' => 0,
                    'declined' => 0,
                    'assigned' => 0,
                    'in_progress' => 0,
                    'resolved' => 0,
                ],
                'assignment_counts' => [
                    'awaiting_assignment' => 0,
                ],
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 10,
                    'total' => 0,
                ],
            ]);
    }
}
