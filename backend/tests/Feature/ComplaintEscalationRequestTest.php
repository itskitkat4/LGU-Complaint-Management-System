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

class ComplaintEscalationRequestTest extends TestCase
{
    private string $barangayHeadId = '11111111-1111-4111-8111-111111111111';
    private string $departmentHeadId = '22222222-2222-4222-8222-222222222222';
    private string $otherBarangayHeadId = '33333333-3333-4333-8333-333333333333';
    private string $citizenId = '44444444-4444-4444-8444-444444444444';

    private string $barangayId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private string $departmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    private string $otherDepartmentId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    private string $complaintId;
    private string $barangayEmail = 'barangay@example.com';
    private string $departmentEmail = 'department@example.com';

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
            $table->uuid('category_id')->nullable();
            $table->uuid('barangay_id')->nullable();
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
        ]);

        Profile::create([
            'id' => $this->barangayHeadId,
            'full_name' => 'Test Barangay Head',
            'email' => $this->barangayEmail,
            'role' => 'Barangay_Head',
            'barangay_id' => $this->barangayId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->departmentHeadId,
            'full_name' => 'Test Department Head',
            'email' => $this->departmentEmail,
            'role' => 'Department_Head',
            'department_id' => $this->departmentId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->otherBarangayHeadId,
            'full_name' => 'Other Barangay Head',
            'email' => 'other@example.com',
            'role' => 'Barangay_Head',
            'barangay_id' => 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->citizenId,
            'full_name' => 'Test Citizen',
            'email' => 'citizen@example.com',
            'role' => 'citizen',
            'is_active' => true,
        ]);

        $complaint = Complaint::create([
            'title' => 'Test complaint',
            'description' => 'Complaint created for escalation testing.',
            'priority' => 'medium',
            'status' => 'in_progress',
            'resolution_level' => 'barangay',
            'barangay_id' => $this->barangayId,
        ]);

        $this->complaintId = $complaint->id;

        ComplaintAssignment::create([
            'complaint_id' => $complaint->id,
            'assigned_to' => $this->barangayHeadId,
            'assigned_by' => $this->barangayHeadId,
            'assignment_level' => 'barangay',
            'barangay_id' => $this->barangayId,
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

    public function test_barangay_head_can_request_department_escalation(): void
    {
        $this->authenticateAs($this->barangayHeadId, $this->barangayEmail);

        $response = $this->postJson(
            "/api/complaints/{$this->complaintId}/escalations",
            [
                'reason' => 'This issue requires department-level resources.',
                'destination_department_id' => $this->departmentId,
            ]
        );

        $response->assertCreated();

        $this->assertDatabaseHas('complaint_escalations', [
            'complaint_id' => $this->complaintId,
            'escalation_type' => 'barangay_to_department',
            'requested_by' => $this->barangayHeadId,
            'origin_barangay_id' => $this->barangayId,
            'destination_department_id' => $this->departmentId,
            'status' => 'pending',
        ]);
    }

    public function test_department_head_can_request_higher_authority_escalation(): void
    {
        // Move the active assignment to the Department Head.
        ComplaintAssignment::where('complaint_id', $this->complaintId)
            ->update(['ended_at' => now()]);

        ComplaintAssignment::create([
            'complaint_id' => $this->complaintId,
            'assigned_to' => $this->departmentHeadId,
            'assigned_by' => $this->departmentHeadId,
            'assignment_level' => 'lgu',
            'department_id' => $this->departmentId,
            'assigned_at' => now(),
        ]);

        Complaint::where('id', $this->complaintId)
            ->update(['resolution_level' => 'lgu']);

        $this->authenticateAs($this->departmentHeadId, $this->departmentEmail);

        $response = $this->postJson(
            "/api/complaints/{$this->complaintId}/escalations",
            [
                'reason' => 'This issue requires authority beyond our department.',
                'higher_authority_office' => 'Mayor’s Office',
            ]
        );

        $response->assertCreated();

        $this->assertDatabaseHas('complaint_escalations', [
            'complaint_id' => $this->complaintId,
            'escalation_type' => 'department_to_higher_authority',
            'requested_by' => $this->departmentHeadId,
            'origin_department_id' => $this->departmentId,
            'higher_authority_office' => 'Mayor’s Office',
            'status' => 'pending',
        ]);
    }

    public function test_citizen_cannot_request_escalation(): void
    {
        $this->authenticateAs($this->citizenId, 'citizen@example.com');

        $response = $this->postJson(
            "/api/complaints/{$this->complaintId}/escalations",
            [
                'reason' => 'This is an unauthorized escalation request.',
                'destination_department_id' => $this->departmentId,
            ]
        );

        $response->assertForbidden();

        $this->assertDatabaseCount('complaint_escalations', 0);
    }

    public function test_escalation_requires_valid_reason(): void
    {
        $this->authenticateAs($this->barangayHeadId, $this->barangayEmail);

        $response = $this->postJson(
            "/api/complaints/{$this->complaintId}/escalations",
            [
                'reason' => 'Short',
                'destination_department_id' => $this->departmentId,
            ]
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['reason']);

        $this->assertDatabaseCount('complaint_escalations', 0);
    }

    public function test_escalation_request_does_not_change_complaint_or_active_assignment(): void
    {
        $this->authenticateAs($this->barangayHeadId, $this->barangayEmail);

        $response = $this->postJson(
            "/api/complaints/{$this->complaintId}/escalations",
            [
                'reason' => 'This issue requires additional technical support.',
                'destination_department_id' => $this->departmentId,
            ]
        );

        $response->assertCreated();

        $this->assertDatabaseHas('complaints', [
            'id' => $this->complaintId,
            'status' => 'in_progress',
            'resolution_level' => 'barangay',
        ]);

        $this->assertDatabaseHas('complaint_assignments', [
            'complaint_id' => $this->complaintId,
            'assigned_to' => $this->barangayHeadId,
            'ended_at' => null,
        ]);

        $this->assertDatabaseCount('complaint_escalations', 1);
    }
}
