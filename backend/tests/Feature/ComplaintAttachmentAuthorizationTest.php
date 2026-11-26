<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Services\SupabaseStorageService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class ComplaintAttachmentAuthorizationTest extends TestCase
{
    private const HEAD_ID = '11111111-1111-4111-8111-111111111111';
    private const OTHER_HEAD_ID = '12121212-1212-4121-8121-121212121212';
    private const PERSONNEL_ID = '22222222-2222-4222-8222-222222222222';
    private const OTHER_PERSONNEL_ID = '23232323-2323-4232-8232-232323232323';
    private const CITIZEN_ID = '33333333-3333-4333-8333-333333333333';
    private const OTHER_CITIZEN_ID = '34343434-3434-4343-8343-343434343434';
    private const STAFF_ID = '44444444-4444-4444-8444-444444444444';
    private const BARANGAY_HEAD_ID = '45454545-4545-4545-8545-454545454545';
    private const DEPARTMENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const OTHER_DEPARTMENT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    private const BARANGAY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    private const COMPLAINT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    private const ATTACHMENT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('complaint_attachments');
        Schema::dropIfExists('complaint_resolution_attachments');
        Schema::dropIfExists('complaint_updates');
        Schema::dropIfExists('complaint_assignments');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('profiles');

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

        Schema::create('barangays', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
        });
        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id');
            $table->boolean('is_anonymous')->default(false);
            $table->uuid('category_id')->nullable();
            $table->uuid('barangay_id')->nullable();
            $table->string('title');
            $table->text('description');
            $table->string('priority')->default('medium');
            $table->string('status')->default('assigned');
            $table->string('resolution_level')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('complaint_updates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('updated_by')->nullable();
            $table->string('old_status')->nullable();
            $table->string('new_status')->nullable();
            $table->text('comment')->nullable();
            $table->timestamp('created_at')->nullable();
        });
        Schema::create('complaint_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('assigned_to');
            $table->uuid('assigned_by');
            $table->string('assignment_level');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('ended_at')->nullable();
        });

        Schema::create('complaint_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('uploaded_by');
            $table->string('file_path');
            $table->string('file_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size');
            $table->timestamp('created_at')->nullable();
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

        Schema::create('complaint_resolutions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('submitted_by')->nullable();
            $table->text('resolution_description')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('review_status');
            $table->uuid('reviewed_by')->nullable();
            $table->text('review_comment')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
        });

        $this->createProfile(self::HEAD_ID, 'Department_Head', self::DEPARTMENT_ID);
        $this->createProfile(self::OTHER_HEAD_ID, 'Department_Head', self::OTHER_DEPARTMENT_ID);
        $this->createProfile(self::PERSONNEL_ID, 'Department_Personnel', self::DEPARTMENT_ID);
        $this->createProfile(self::OTHER_PERSONNEL_ID, 'Department_Personnel', self::OTHER_DEPARTMENT_ID);
        $this->createProfile(self::CITIZEN_ID, 'citizen');
        $this->createProfile(self::OTHER_CITIZEN_ID, 'citizen');
        $this->createProfile(self::STAFF_ID, 'LGU-Staff');
        $this->createProfile(self::BARANGAY_HEAD_ID, 'Barangay_Head', null, self::BARANGAY_ID);

        DB::table('barangays')->insert([
            'id' => self::BARANGAY_ID,
            'name' => 'Test Barangay',
        ]);
        DB::table('complaints')->insert([
            'id' => self::COMPLAINT_ID,
            'citizen_id' => self::CITIZEN_ID,
            'barangay_id' => self::BARANGAY_ID,
            'title' => 'Road repair',
            'description' => 'A road requires repair.',
            'status' => 'assigned',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('complaint_attachments')->insert([
            'id' => self::ATTACHMENT_ID,
            'complaint_id' => self::COMPLAINT_ID,
            'uploaded_by' => self::CITIZEN_ID,
            'file_path' => 'complaints/private/evidence.jpg',
            'file_name' => 'evidence.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
            'created_at' => now(),
        ]);
    }

    private function createProfile(
        string $id,
        string $role,
        ?string $departmentId = null,
        ?string $barangayId = null
    ): void {
        Profile::create([
            'id' => $id,
            'full_name' => $role,
            'email' => "{$id}@example.com",
            'role' => $role,
            'department_id' => $departmentId,
            'barangay_id' => $barangayId,
            'is_active' => true,
        ]);
    }

    private function authenticateAs(string $id): void
    {
        Http::fake([
            '*' => Http::response([
                'id' => $id,
                'email' => "{$id}@example.com",
                'app_metadata' => ['bantayserbisyo_password_setup_completed' => true],
            ], 200),
        ]);

        $this->withToken($this->syntheticSupabaseToken($id, ['password']));
    }

    private function createAssignment(
        string $assignedTo,
        ?string $departmentId = self::DEPARTMENT_ID,
        string $assignmentLevel = 'lgu',
        ?string $endedAt = null
    ): void {
        DB::table('complaint_assignments')->insert([
            'id' => (string) str()->uuid(),
            'complaint_id' => self::COMPLAINT_ID,
            'assigned_to' => $assignedTo,
            'assigned_by' => self::HEAD_ID,
            'assignment_level' => $assignmentLevel,
            'department_id' => $departmentId,
            'assigned_at' => now(),
            'ended_at' => $endedAt,
        ]);
    }

    private function mockSignedUrl(string $path = 'complaints/private/evidence.jpg'): void
    {
        $storage = Mockery::mock(SupabaseStorageService::class);
        $storage->shouldReceive('createSignedUrl')
            ->once()
            ->with($path)
            ->andReturn('https://storage.example/signed-evidence');

        $this->app->instance(SupabaseStorageService::class, $storage);
    }

    private function createResolutionEvidence(string $status, ?string $complaintId = null): string
    {
        $resolutionId = (string) str()->uuid();
        DB::table('complaint_resolutions')->insert([
            'id' => $resolutionId,
            'complaint_id' => $complaintId ?? self::COMPLAINT_ID,
            'review_status' => $status,
        ]);

        $attachmentId = (string) str()->uuid();
        DB::table('complaint_resolution_attachments')->insert([
            'id' => $attachmentId,
            'resolution_id' => $resolutionId,
            'uploaded_by' => self::STAFF_ID,
            'file_path' => 'resolutions/private/evidence.jpg',
            'file_name' => 'evidence.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
            'evidence_type' => 'before',
            'created_at' => now(),
        ]);

        return $attachmentId;
    }

    public function test_citizen_complaint_detail_includes_anonymity_flag(): void
    {
        DB::table('complaints')
            ->where('id', self::COMPLAINT_ID)
            ->update(['is_anonymous' => true]);

        $this->authenticateAs(self::CITIZEN_ID);

        $response = $this->getJson('/api/complaints/' . self::COMPLAINT_ID)
            ->assertOk();

        $complaint = $response->json('complaint');

        $this->assertIsArray($complaint);
        $this->assertSame(self::COMPLAINT_ID, $complaint['id']);
        $this->assertTrue($complaint['is_anonymous']);
    }
    public function test_citizen_complaint_history_includes_anonymity_flag(): void
    {
        DB::table('complaints')
            ->where('id', self::COMPLAINT_ID)
            ->update(['is_anonymous' => true]);

        $this->authenticateAs(self::CITIZEN_ID);

        $response = $this->getJson('/api/complaints')
            ->assertOk();

        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertSame(self::COMPLAINT_ID, $data[0]['id']);
        $this->assertTrue($data[0]['is_anonymous']);
    }
    public function test_department_head_can_access_evidence_assigned_directly_to_them(): void
    {
        $this->createAssignment(self::HEAD_ID);
        $this->mockSignedUrl();
        $this->authenticateAs(self::HEAD_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertOk()
            ->assertJsonPath('signed_url', 'https://storage.example/signed-evidence')
            ->assertJsonPath('expires_in', 300);
    }

    public function test_department_head_can_access_evidence_assigned_to_personnel_in_their_department(): void
    {
        $this->createAssignment(self::PERSONNEL_ID);
        $this->mockSignedUrl();
        $this->authenticateAs(self::HEAD_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertOk()
            ->assertJsonPath('signed_url', 'https://storage.example/signed-evidence');
    }

    public function test_department_head_cannot_access_evidence_for_another_department(): void
    {
        $this->createAssignment(self::OTHER_PERSONNEL_ID, self::OTHER_DEPARTMENT_ID);
        $this->authenticateAs(self::HEAD_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertForbidden();
    }

    public function test_department_head_cannot_access_evidence_for_ended_direct_assignment(): void
    {
        $this->createAssignment(self::HEAD_ID, endedAt: now());
        $this->authenticateAs(self::HEAD_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertForbidden();
    }

    public function test_unrelated_department_head_cannot_access_evidence(): void
    {
        $this->createAssignment(self::HEAD_ID);
        $this->authenticateAs(self::OTHER_HEAD_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertForbidden();
    }

    public function test_invalid_attachment_id_returns_not_found(): void
    {
        $this->authenticateAs(self::HEAD_ID);

        $this->getJson('/api/complaint-attachments/ffffffff-ffff-4fff-8fff-ffffffffffff/signed-url')
            ->assertNotFound();
    }

    public function test_citizen_can_access_their_own_attachment(): void
    {
        $this->mockSignedUrl();
        $this->authenticateAs(self::CITIZEN_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertOk();
    }

    public function test_lgu_staff_attachment_permission_is_preserved(): void
    {
        $this->mockSignedUrl();
        $this->authenticateAs(self::STAFF_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertOk();
    }

    public function test_citizen_cannot_access_another_citizens_attachment(): void
    {
        $this->authenticateAs(self::OTHER_CITIZEN_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertForbidden();
    }

    public function test_citizen_cannot_access_pending_or_returned_resolution_evidence(): void
    {
        foreach (['pending_review', 'returned'] as $status) {
            $attachmentId = $this->createResolutionEvidence($status);
            $this->authenticateAs(self::CITIZEN_ID);

            $this->getJson('/api/complaint-attachments/' . $attachmentId . '/signed-url')
                ->assertForbidden();
        }
    }

    public function test_citizen_can_access_approved_evidence_for_their_complaint_only(): void
    {
        $attachmentId = $this->createResolutionEvidence('approved');
        $otherComplaintId = 'dededede-dede-4ded-8ded-dededededede';
        DB::table('barangays')->updateOrInsert(
            ['id' => self::BARANGAY_ID],
            ['name' => 'Test Barangay']
        );
        DB::table('complaints')->insert([
            'id' => $otherComplaintId,
            'citizen_id' => self::OTHER_CITIZEN_ID,
            'barangay_id' => self::BARANGAY_ID,
            'title' => 'Other complaint',
            'description' => 'Belongs to a different citizen.',
            'status' => 'resolved',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $otherAttachmentId = $this->createResolutionEvidence('approved', $otherComplaintId);

        $this->mockSignedUrl('resolutions/private/evidence.jpg');
        $this->authenticateAs(self::CITIZEN_ID);
        $this->getJson('/api/complaint-attachments/' . $attachmentId . '/signed-url')
            ->assertOk();
        $this->getJson('/api/complaint-attachments/' . $otherAttachmentId . '/signed-url')
            ->assertForbidden();
    }

    public function test_barangay_head_attachment_permission_is_preserved(): void
    {
        $this->mockSignedUrl();
        $this->authenticateAs(self::BARANGAY_HEAD_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertOk();
    }

    public function test_department_personnel_attachment_permission_is_preserved(): void
    {
        $this->createAssignment(self::PERSONNEL_ID);
        $this->mockSignedUrl();
        $this->authenticateAs(self::PERSONNEL_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertOk();
    }

    public function test_other_department_personnel_cannot_access_the_attachment(): void
    {
        $this->createAssignment(self::PERSONNEL_ID);
        $this->authenticateAs(self::OTHER_PERSONNEL_ID);

        $this->getJson('/api/complaint-attachments/' . self::ATTACHMENT_ID . '/signed-url')
            ->assertForbidden();
    }
}
