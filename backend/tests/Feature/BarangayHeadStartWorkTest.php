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

class BarangayHeadStartWorkTest extends TestCase
{
    private string $barangayHeadId = '22222222-2222-4222-8222-222222222222';
    private string $staffId = '11111111-1111-4111-8111-111111111111';

    private string $barangayId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private string $otherBarangayId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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

        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id')->nullable();
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

        Schema::create('complaint_updates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('updated_by');
            $table->string('old_status')->nullable();
            $table->string('new_status')->nullable();
            $table->text('comment')->nullable();
        });

        Profile::create([
            'id' => $this->barangayHeadId,
            'full_name' => 'Test Barangay Head',
            'email' => 'barangay@example.com',
            'role' => 'Barangay_Head',
            'barangay_id' => $this->barangayId,
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->staffId,
            'full_name' => 'Test LGU Staff',
            'email' => 'staff@example.com',
            'role' => 'LGU-Staff',
            'is_active' => true,
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

    private function createComplaint(
        string $status = 'assigned',
        ?string $barangayId = null
    ): Complaint {
        return Complaint::create([
            'title' => 'Test complaint',
            'description' => 'Complaint created for start work testing.',
            'priority' => 'medium',
            'status' => $status,
            'resolution_level' => 'barangay',
            'barangay_id' => $barangayId ?? $this->barangayId,
        ]);
    }

    private function assignComplaint(Complaint $complaint): void
    {
        ComplaintAssignment::create([
            'complaint_id' => $complaint->id,
            'assigned_to' => $this->barangayHeadId,
            'assigned_by' => $this->staffId,
            'assignment_level' => 'barangay',
            'barangay_id' => $this->barangayId,
            'assigned_at' => now(),
            'ended_at' => null,
        ]);
    }

    public function test_barangay_head_can_start_assigned_complaint(): void
    {
        $complaint = $this->createComplaint();

        $this->assignComplaint($complaint);

        $this->authenticateAs(
            $this->barangayHeadId,
            'barangay@example.com'
        );

        $response = $this->postJson(
            "/api/barangay/complaints/{$complaint->id}/start"
        );

        $response->assertOk();

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'in_progress',
        ]);

        $this->assertDatabaseHas('complaint_updates', [
            'complaint_id' => $complaint->id,
            'updated_by' => $this->barangayHeadId,
            'old_status' => 'assigned',
            'new_status' => 'in_progress',
            'comment' => 'Barangay Head started working on the complaint.',
        ]);
    }

    public function test_barangay_head_cannot_start_unassigned_complaint(): void
    {
        $complaint = $this->createComplaint();

        $this->authenticateAs(
            $this->barangayHeadId,
            'barangay@example.com'
        );

        $response = $this->postJson(
            "/api/barangay/complaints/{$complaint->id}/start"
        );

        $response->assertForbidden();

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'assigned',
        ]);

        $this->assertDatabaseCount('complaint_updates', 0);
    }

    public function test_barangay_head_cannot_start_complaint_from_another_barangay(): void
    {
        $complaint = $this->createComplaint(
            'assigned',
            $this->otherBarangayId
        );

        $this->assignComplaint($complaint);

        $this->authenticateAs(
            $this->barangayHeadId,
            'barangay@example.com'
        );

        $response = $this->postJson(
            "/api/barangay/complaints/{$complaint->id}/start"
        );

        $response->assertForbidden();

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'assigned',
        ]);
    }

    public function test_barangay_head_cannot_start_complaint_that_is_not_assigned_status(): void
    {
        $complaint = $this->createComplaint('in_progress');

        $this->assignComplaint($complaint);

        $this->authenticateAs(
            $this->barangayHeadId,
            'barangay@example.com'
        );

        $response = $this->postJson(
            "/api/barangay/complaints/{$complaint->id}/start"
        );

        $response->assertUnprocessable();

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'in_progress',
        ]);

        $this->assertDatabaseCount('complaint_updates', 0);
    }
}