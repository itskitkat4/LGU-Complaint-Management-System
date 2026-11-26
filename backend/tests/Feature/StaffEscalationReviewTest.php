<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\ComplaintEscalation;
use App\Models\Profile;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StaffEscalationReviewTest extends TestCase
{
    private string $staffId = '11111111-1111-4111-8111-111111111111';
    private string $barangayHeadId = '22222222-2222-4222-8222-222222222222';
    private string $departmentHeadId = '33333333-3333-4333-8333-333333333333';
    private string $otherDepartmentHeadId = '44444444-4444-4444-8444-444444444444';

    private string $citizenId = '55555555-5555-4555-8555-555555555555';

    private string $barangayId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private string $departmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    private string $otherDepartmentId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    private string $emptyDepartmentId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

    private string $complaintId;
    private string $escalationId;

    protected function setUp(): void
    {
        parent::setUp();

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

        Schema::create('barangays', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
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
            $table->boolean('is_anonymous')->default(false);
            $table->uuid('category_id')->nullable();
            $table->uuid('barangay_id')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('priority')->default('medium');
            $table->string('status')->default('assigned');
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

        Schema::create('complaint_updates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('updated_by');
            $table->string('old_status')->nullable();
            $table->string('new_status')->nullable();
            $table->text('comment')->nullable();
        });

        DB::table('barangays')->insert([
            'id' => $this->barangayId,
            'name' => 'Test Barangay',
            'created_at' => now(),
            'updated_at' => now(),
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
            [
                'id' => $this->emptyDepartmentId,
                'name' => 'Unassigned Department',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $this->createProfile(
            $this->staffId,
            'LGU Staff',
            'staff@example.com',
            'LGU-Staff'
        );

        $this->createProfile(
            $this->barangayHeadId,
            'Barangay Head',
            'barangay@example.com',
            'Barangay_Head',
            $this->barangayId
        );

        $this->createProfile(
            $this->departmentHeadId,
            'Engineering Head',
            'engineering@example.com',
            'Department_Head',
            null,
            $this->departmentId
        );

        $this->createProfile(
            $this->otherDepartmentHeadId,
            'Health Head',
            'health@example.com',
            'Department_Head',
            null,
            $this->otherDepartmentId
        );

        $this->createProfile(
            $this->citizenId,
            'Test Citizen',
            'citizen@example.com',
            'citizen'
        );

        $this->createEscalation();
    }

    private function createProfile(
        string $id,
        string $name,
        string $email,
        string $role,
        ?string $barangayId = null,
        ?string $departmentId = null
    ): void {
        Profile::create([
            'id' => $id,
            'full_name' => $name,
            'email' => $email,
            'role' => $role,
            'barangay_id' => $barangayId,
            'department_id' => $departmentId,
            'is_active' => true,
        ]);
    }

    private function createEscalation(): void
    {
        $complaint = Complaint::create([
            'title' => 'Unresolved barangay complaint',
            'description' => 'This complaint requires assistance from the LGU.',
            'priority' => 'medium',
            'status' => 'in_progress',
            'resolution_level' => 'barangay',
            'barangay_id' => $this->barangayId,
        ]);

        $this->complaintId = $complaint->id;

        ComplaintAssignment::create([
            'complaint_id' => $complaint->id,
            'assigned_to' => $this->barangayHeadId,
            'assigned_by' => $this->staffId,
            'assignment_level' => 'barangay',
            'barangay_id' => $this->barangayId,
            'notes' => 'Original barangay assignment.',
            'assigned_at' => now(),
        ]);

        $escalation = ComplaintEscalation::create([
            'complaint_id' => $complaint->id,
            'escalation_type' => 'barangay_to_department',
            'requested_by' => $this->barangayHeadId,
            'origin_barangay_id' => $this->barangayId,
            'destination_department_id' => $this->departmentId,
            'reason' => 'This concern requires resources from the LGU department.',
            'status' => 'pending',
        ]);

        $this->escalationId = $escalation->id;
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

    private function reviewUrl(): string
    {
        return "/api/staff/escalations/{$this->escalationId}/review";
    }

    public function test_staff_escalation_response_includes_anonymity_flag_without_citizen_identity(): void
    {
        DB::table('complaints')
            ->where('id', $this->complaintId)
            ->update(['is_anonymous' => true]);

        $this->authenticateAs($this->staffId, 'staff@example.com');

        $response = $this->getJson('/api/staff/escalations')
            ->assertOk();

        $data = $response->json('data');

        $this->assertCount(1, $data);

        $complaint = $data[0]['complaint'] ?? null;

        $this->assertIsArray($complaint);
        $this->assertTrue($complaint['is_anonymous']);
        $this->assertArrayNotHasKey('citizen_id', $complaint);
        $this->assertArrayNotHasKey('citizen', $complaint);
    }
    public function test_lgu_staff_can_accept_barangay_escalation(): void
    {
        $this->authenticateAs($this->staffId, 'staff@example.com');

        $response = $this->postJson($this->reviewUrl(), [
            'decision' => 'accepted',
            'review_comment' => 'Accepted because the issue requires department assistance.',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('complaint_escalations', [
            'id' => $this->escalationId,
            'status' => 'accepted',
            'reviewed_by' => $this->staffId,
            'destination_department_id' => $this->departmentId,
        ]);

        $this->assertDatabaseHas('complaints', [
            'id' => $this->complaintId,
            'status' => 'assigned',
            'resolution_level' => 'lgu',
        ]);

        $this->assertDatabaseHas('complaint_assignments', [
            'complaint_id' => $this->complaintId,
            'assigned_to' => $this->departmentHeadId,
            'department_id' => $this->departmentId,
            'ended_at' => null,
        ]);
    }

    public function test_lgu_staff_can_redirect_escalation_to_another_department(): void
    {
        $this->authenticateAs($this->staffId, 'staff@example.com');

        $response = $this->postJson($this->reviewUrl(), [
            'decision' => 'redirected',
            'destination_department_id' => $this->otherDepartmentId,
            'review_comment' => 'Redirected because another department handles this concern.',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('complaint_escalations', [
            'id' => $this->escalationId,
            'status' => 'redirected',
            'reviewed_by' => $this->staffId,
            'destination_department_id' => $this->otherDepartmentId,
        ]);

        $this->assertDatabaseHas('complaint_assignments', [
            'complaint_id' => $this->complaintId,
            'assigned_to' => $this->otherDepartmentHeadId,
            'department_id' => $this->otherDepartmentId,
            'ended_at' => null,
        ]);
    }

    public function test_escalation_cannot_be_redirected_to_department_without_active_head(): void
    {
        $this->authenticateAs($this->staffId, 'staff@example.com');

        $response = $this->postJson($this->reviewUrl(), [
            'decision' => 'redirected',
            'destination_department_id' => $this->emptyDepartmentId,
            'review_comment' => 'Redirecting to this department for review.',
        ]);

        $response->assertUnprocessable();

        $this->assertDatabaseHas('complaint_escalations', [
            'id' => $this->escalationId,
            'status' => 'pending',
        ]);
    }

    public function test_non_lgu_staff_cannot_review_escalation(): void
    {
        $this->authenticateAs($this->citizenId, 'citizen@example.com');

        $response = $this->postJson($this->reviewUrl(), [
            'decision' => 'accepted',
            'review_comment' => 'Unauthorized escalation review attempt.',
        ]);

        $response->assertForbidden();

        $this->assertDatabaseHas('complaint_escalations', [
            'id' => $this->escalationId,
            'status' => 'pending',
        ]);
    }

    public function test_escalation_cannot_be_reviewed_twice(): void
    {
        $this->authenticateAs($this->staffId, 'staff@example.com');

        $payload = [
            'decision' => 'accepted',
            'review_comment' => 'Accepted because the issue requires department assistance.',
        ];

        $this->postJson($this->reviewUrl(), $payload)
            ->assertOk();

        $this->postJson($this->reviewUrl(), $payload)
            ->assertUnprocessable();

        $this->assertDatabaseHas('complaint_escalations', [
            'id' => $this->escalationId,
            'status' => 'accepted',
        ]);
    }

    public function test_escalation_review_requires_valid_comment(): void
    {
        $this->authenticateAs($this->staffId, 'staff@example.com');

        $response = $this->postJson($this->reviewUrl(), [
            'decision' => 'accepted',
            'review_comment' => 'Short',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['review_comment']);

        $this->assertDatabaseHas('complaint_escalations', [
            'id' => $this->escalationId,
            'status' => 'pending',
        ]);
    }
}
