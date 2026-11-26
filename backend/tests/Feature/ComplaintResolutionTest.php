<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\ComplaintResolution;
use App\Models\Profile;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ComplaintResolutionTest extends TestCase
{
    private string $staffId = '11111111-1111-4111-8111-111111111111';
    private string $barangayHeadId = '22222222-2222-4222-8222-222222222222';
    private string $departmentPersonnelId = '33333333-3333-4333-8333-333333333333';
    private string $citizenId = '44444444-4444-4444-8444-444444444444';

    private string $barangayId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private string $departmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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

        Schema::create('complaint_resolutions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('submitted_by');
            $table->text('resolution_description');
            $table->date('completed_at')->nullable();
            $table->string('review_status')->default('pending_review');
            $table->uuid('reviewed_by')->nullable();
            $table->text('review_comment')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('complaint_resolution_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('resolution_id');
            $table->uuid('uploaded_by');
            $table->string('file_path');
            $table->string('file_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size');
            $table->string('evidence_type')->default('supporting');
            $table->timestamp('created_at')->nullable();
        });
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('profile_id');
            $table->uuid('complaint_id')->nullable();
            $table->string('title');
            $table->text('message');
            $table->string('type', 50);
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['profile_id', 'is_read']);
            $table->index(['profile_id', 'created_at']);
        });

        Schema::create('complaint_updates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('updated_by');
            $table->string('old_status')->nullable();
            $table->string('new_status')->nullable();
            $table->text('comment')->nullable();
        });

        Profile::create([
            'id' => $this->staffId,
            'full_name' => 'Test LGU Staff',
            'email' => 'staff@example.com',
            'role' => 'LGU-Staff',
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->barangayHeadId,
            'full_name' => 'Test Barangay Head',
            'email' => 'barangay@example.com',
            'role' => 'Barangay_Head',
            'barangay_id' => $this->barangayId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->departmentPersonnelId,
            'full_name' => 'Test Department Personnel',
            'email' => 'personnel@example.com',
            'role' => 'Department_Personnel',
            'department_id' => $this->departmentId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->citizenId,
            'full_name' => 'Test Citizen',
            'email' => 'citizen@example.com',
            'role' => 'citizen',
            'is_active' => true,
        ]);

        DB::table('departments')->insert([
            'id' => $this->departmentId,
            'name' => 'Engineering Department',
            'created_at' => now(),
            'updated_at' => now(),
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
            'description' => 'Complaint created for resolution tests.',
            'priority' => 'medium',
            'status' => 'in_progress',
            'resolution_level' => $level,
            'citizen_id' => $this->citizenId,
            'barangay_id' => $this->barangayId,
        ]);
    }

    private function assignComplaint(
        Complaint $complaint,
        string $assigneeId,
        string $level
    ): void {
        ComplaintAssignment::create([
            'complaint_id' => $complaint->id,
            'assigned_to' => $assigneeId,
            'assigned_by' => $this->staffId,
            'assignment_level' => $level,
            'barangay_id' => $level === 'barangay' ? $this->barangayId : null,
            'department_id' => $level === 'lgu' ? $this->departmentId : null,
            'assigned_at' => now(),
        ]);
    }

    private function createPendingResolution(Complaint $complaint): ComplaintResolution
    {
        return ComplaintResolution::create([
            'complaint_id' => $complaint->id,
            'submitted_by' => $complaint->resolution_level === 'barangay'
                ? $this->barangayHeadId
                : $this->departmentPersonnelId,
            'resolution_description' => 'The reported issue has been addressed and completed.',
            'review_status' => 'pending_review',
            'submitted_at' => now(),
        ]);
    }

    private function resolutionEvidence(): array
    {
        return [
            'resolution_description' => 'The complaint has been addressed and corrective work completed.',
            'completed_at' => now()->toDateString(),
            'before_photo' => UploadedFile::fake()->image('before.jpg'),
            'evidence' => [UploadedFile::fake()->image('supporting.jpg')],
        ];
    }

    public function test_barangay_head_can_submit_resolution(): void
    {
        $complaint = $this->createComplaint('barangay');

        $secondStaffId = '55555555-5555-4555-8555-555555555555';
        $inactiveStaffId = '66666666-6666-4666-8666-666666666666';

        Profile::create([
            'id' => $secondStaffId,
            'full_name' => 'Second LGU Staff',
            'email' => 'staff2@example.com',
            'role' => 'LGU-Staff',
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $inactiveStaffId,
            'full_name' => 'Inactive LGU Staff',
            'email' => 'inactive-staff@example.com',
            'role' => 'LGU-Staff',
            'is_active' => false,
        ]);

        $this->assignComplaint($complaint, $this->barangayHeadId, 'barangay');

        $this->authenticateAs($this->barangayHeadId, 'barangay@example.com');

        $response = $this->post(
            "/api/complaints/{$complaint->id}/resolutions",
            $this->resolutionEvidence(),
            ['Accept' => 'application/json']
        );

        $response->assertCreated();

        // Every active LGU Staff account receives the shared review-queue notification.
        $this->assertDatabaseHas('notifications', [
            'profile_id' => $this->staffId,
            'complaint_id' => $complaint->id,
            'type' => 'resolution_submitted',
            'is_read' => false,
        ]);

        $this->assertDatabaseHas('notifications', [
            'profile_id' => $secondStaffId,
            'complaint_id' => $complaint->id,
            'type' => 'resolution_submitted',
            'is_read' => false,
        ]);

        // Inactive LGU Staff must not receive a notification.
        $this->assertDatabaseMissing('notifications', [
            'profile_id' => $inactiveStaffId,
            'complaint_id' => $complaint->id,
            'type' => 'resolution_submitted',
        ]);

        $this->assertDatabaseCount('notifications', 2);

        $this->assertDatabaseHas('complaint_resolutions', [
            'complaint_id' => $complaint->id,
            'submitted_by' => $this->barangayHeadId,
            'review_status' => 'pending_review',
        ]);
        $this->assertSame(
            now()->toDateString(),
            ComplaintResolution::where('complaint_id', $complaint->id)
                ->firstOrFail()->completed_at->toDateString()
        );
        $this->assertDatabaseHas('complaint_resolution_attachments', [
            'resolution_id' => $response->json('data.id'),
            'evidence_type' => 'before',
        ]);
        $this->assertDatabaseHas('complaint_resolution_attachments', [
            'resolution_id' => $response->json('data.id'),
            'evidence_type' => 'supporting',
        ]);

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_department_personnel_can_submit_resolution(): void
    {
        $complaint = $this->createComplaint('lgu');

        $this->assignComplaint($complaint, $this->departmentPersonnelId, 'lgu');

        $this->authenticateAs(
            $this->departmentPersonnelId,
            'personnel@example.com'
        );

        $response = $this->post(
            "/api/complaints/{$complaint->id}/resolutions",
            $this->resolutionEvidence(),
            ['Accept' => 'application/json']
        );

        $response->assertCreated();

        $this->assertDatabaseHas('complaint_resolutions', [
            'complaint_id' => $complaint->id,
            'submitted_by' => $this->departmentPersonnelId,
            'review_status' => 'pending_review',
        ]);

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_citizen_cannot_submit_resolution(): void
    {
        $complaint = $this->createComplaint('barangay');

        $this->authenticateAs($this->citizenId, 'citizen@example.com');

        $response = $this->postJson(
            "/api/complaints/{$complaint->id}/resolutions",
            [
                'resolution_description' => 'This should not be accepted.',
            ]
        );

        $response->assertForbidden();

        $this->assertDatabaseCount('complaint_resolutions', 0);
    }

    public function test_department_head_cannot_submit_resolution(): void
    {
        $headId = '77777777-7777-4777-8777-777777777777';
        Profile::create([
            'id' => $headId,
            'full_name' => 'Department Head',
            'email' => 'head@example.com',
            'role' => 'Department_Head',
            'department_id' => $this->departmentId,
            'is_active' => true,
        ]);
        $complaint = $this->createComplaint('lgu');
        $this->authenticateAs($headId, 'head@example.com');

        $this->postJson("/api/complaints/{$complaint->id}/resolutions", [])
            ->assertForbidden();
        $this->assertDatabaseCount('complaint_resolutions', 0);
    }

    public function test_completion_date_must_be_valid_and_not_in_the_future(): void
    {
        $complaint = $this->createComplaint('barangay');
        $this->assignComplaint($complaint, $this->barangayHeadId, 'barangay');
        $this->authenticateAs($this->barangayHeadId, 'barangay@example.com');

        $this->postJson("/api/complaints/{$complaint->id}/resolutions", [
            'resolution_description' => 'The repair was completed successfully.',
            'completed_at' => now()->addDay()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('completed_at');
    }

    public function test_lgu_staff_resolution_queue_redacts_anonymous_complaint_identity(): void
    {
        $complaint = $this->createComplaint('barangay');
        $complaint->update([
            'citizen_id' => $this->citizenId,
        ]);
        DB::table('complaints')->where('id', $complaint->id)->update(['is_anonymous' => true]);
        $this->createPendingResolution($complaint);

        $this->authenticateAs($this->staffId, 'staff@example.com');

        $response = $this->getJson('/api/staff/resolutions');

        $response->assertOk()
            ->assertJsonPath('data.0.complaint.is_anonymous', true)
            ->assertJsonMissingPath('data.0.complaint.citizen_id')
            ->assertJsonMissingPath('data.0.complaint.citizen');
    }

    public function test_lgu_staff_can_approve_resolution_and_resolve_complaint(): void
    {
        $complaint = $this->createComplaint('barangay');

        // Create an active assignment before approval.
        $this->assignComplaint($complaint, $this->barangayHeadId, 'barangay');

        $resolution = $this->createPendingResolution($complaint);

        $this->authenticateAs($this->staffId, 'staff@example.com');

        $response = $this->postJson(
            "/api/staff/resolutions/{$resolution->id}/review",
            [
                'decision' => 'approved',
            ]
        );

        $response->assertOk();

        // The resolution submitter is notified of the approval.
        $this->assertDatabaseHas('notifications', [
            'profile_id' => $resolution->submitted_by,
            'complaint_id' => $complaint->id,
            'title' => 'Resolution Approved',
            'type' => 'resolution_approved',
            'is_read' => false,
        ]);

        // The citizen is notified that the complaint has been resolved.
        $this->assertDatabaseHas('notifications', [
            'profile_id' => $this->citizenId,
            'complaint_id' => $complaint->id,
            'title' => 'Complaint Resolved',
            'type' => 'complaint_resolved',
            'is_read' => false,
        ]);

        $this->assertDatabaseCount('notifications', 2);

        $this->assertDatabaseHas('complaint_resolutions', [
            'id' => $resolution->id,
            'review_status' => 'approved',
            'reviewed_by' => $this->staffId,
        ]);

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'resolved',
        ]);

        $this->assertDatabaseHas('complaint_updates', [
            'complaint_id' => $complaint->id,
            'updated_by' => $this->staffId,
            'old_status' => 'in_progress',
            'new_status' => 'resolved',
        ]);
        $this->assertDatabaseMissing('complaint_assignments', [
            'complaint_id' => $complaint->id,
            'ended_at' => null,
        ]);
    }

    public function test_lgu_staff_can_return_resolution_without_resolving_complaint(): void
    {
        $complaint = $this->createComplaint('barangay');

        $resolution = $this->createPendingResolution($complaint);

        $this->authenticateAs($this->staffId, 'staff@example.com');

        $response = $this->postJson(
            "/api/staff/resolutions/{$resolution->id}/review",
            [
                'decision' => 'returned',
                'review_comment' => 'Please provide clearer evidence of the completed repair.',
            ]
        );

        $response->assertOk();

        $this->assertDatabaseHas('notifications', [
            'profile_id' => $resolution->submitted_by,
            'complaint_id' => $complaint->id,
            'title' => 'Resolution Returned',
            'message' => 'Your submitted resolution was returned by LGU Staff. Reason: Please provide clearer evidence of the completed repair.',
            'type' => 'resolution_returned',
            'is_read' => false,
        ]);

        $this->assertDatabaseCount('notifications', 1);

        $this->assertDatabaseHas('complaint_resolutions', [
            'id' => $resolution->id,
            'review_status' => 'returned',
            'reviewed_by' => $this->staffId,
            'review_comment' => 'Please provide clearer evidence of the completed repair.',
        ]);

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'in_progress',
        ]);

        $this->assertDatabaseMissing('complaint_updates', [
            'complaint_id' => $complaint->id,
            'comment' => 'Resolution returned by LGU-Staff.',
        ]);
    }

    public function test_lgu_staff_cannot_return_resolution_with_blank_reason(): void
    {
        $complaint = $this->createComplaint('barangay');
        $resolution = $this->createPendingResolution($complaint);
        $this->authenticateAs($this->staffId, 'staff@example.com');

        $this->postJson("/api/staff/resolutions/{$resolution->id}/review", [
            'decision' => 'returned',
            'review_comment' => " \t ",
        ])->assertUnprocessable()->assertJsonValidationErrors('review_comment');
    }
    public function test_handler_can_resubmit_resolution_after_previous_one_is_returned(): void
    {
        $complaint = $this->createComplaint('barangay');

        $this->assignComplaint($complaint, $this->barangayHeadId, 'barangay');

        $previousResolution = $this->createPendingResolution($complaint);

        // Simulate LGU-Staff returning the previous resolution.
        $previousResolution->update([
            'review_status' => 'returned',
            'reviewed_by' => $this->staffId,
            'review_comment' => 'Please provide clearer evidence.',
        ]);

        $this->authenticateAs($this->barangayHeadId, 'barangay@example.com');

        $response = $this->post(
            "/api/complaints/{$complaint->id}/resolutions",
            $this->resolutionEvidence(),
            ['Accept' => 'application/json']
        );

        $response->assertCreated();

        $this->assertDatabaseHas('complaint_resolutions', [
            'id' => $previousResolution->id,
            'review_status' => 'returned',
        ]);

        $this->assertDatabaseHas('complaint_resolutions', [
            'complaint_id' => $complaint->id,
            'submitted_by' => $this->barangayHeadId,
            'review_status' => 'pending_review',
        ]);

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'in_progress',
        ]);

        $this->assertDatabaseHas('complaint_assignments', [
            'complaint_id' => $complaint->id,
            'assigned_to' => $this->barangayHeadId,
            'ended_at' => null,
        ]);
    }
}
