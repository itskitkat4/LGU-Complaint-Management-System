<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\Profile;
use App\Services\SupabaseStorageService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class ComplaintPriorityWorkflowTest extends TestCase
{
    private const CITIZEN_ID = '11111111-1111-4111-8111-111111111111';
    private const STAFF_ID = '22222222-2222-4222-8222-222222222222';
    private const DEPARTMENT_HEAD_ID = '33333333-3333-4333-8333-333333333333';
    private const BARANGAY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const OTHER_BARANGAY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    private const CATEGORY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('complaint_attachments');
        Schema::dropIfExists('complaint_updates');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('complaint_categories');
        Schema::dropIfExists('barangays');
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
            $table->timestamps();
        });

        Schema::create('complaint_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id');
            $table->boolean('is_anonymous')->default(false);
            $table->uuid('category_id');
            $table->uuid('barangay_id');
            $table->string('title');
            $table->text('description');
            $table->string('priority')->default('medium');
            $table->string('status')->default('submitted');
            $table->string('resolution_level')->nullable();
            $table->text('rejection_reason')->nullable();
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
            $table->string('type');
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
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

        DB::table('barangays')->insert([
            [
                'id' => self::BARANGAY_ID,
                'name' => 'Central',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => self::OTHER_BARANGAY_ID,
                'name' => 'North',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
        DB::table('complaint_categories')->insert([
            'id' => self::CATEGORY_ID,
            'name' => 'Roads',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->createProfile(self::CITIZEN_ID, 'citizen', self::BARANGAY_ID);
        $this->createProfile(self::STAFF_ID, 'LGU-Staff');
        $this->createProfile(self::DEPARTMENT_HEAD_ID, 'Department_Head');
    }

    private function createProfile(
        string $id,
        string $role,
        ?string $barangayId = null
    ): void {
        Profile::create([
            'id' => $id,
            'full_name' => $role,
            'email' => "{$id}@example.com",
            'role' => $role,
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

    private function citizenComplaintPayload(array $overrides = []): array
    {
        return array_merge([
            'barangay_id' => self::BARANGAY_ID,
            'category_id' => self::CATEGORY_ID,
            'title' => 'Damaged road',
            'description' => 'The road needs repair near the market.',
        ], $overrides);
    }

    private function createComplaint(string $status = 'submitted'): Complaint
    {
        return Complaint::create([
            'citizen_id' => self::CITIZEN_ID,
            'category_id' => self::CATEGORY_ID,
            'barangay_id' => self::BARANGAY_ID,
            'title' => 'Damaged road',
            'description' => 'The road needs repair near the market.',
            'priority' => 'medium',
            'status' => $status,
        ]);
    }

    private function mockStorage(): void
    {
        $storage = Mockery::mock(SupabaseStorageService::class);
        $storage->shouldNotReceive('upload');
        $this->app->instance(SupabaseStorageService::class, $storage);
    }

    public function test_citizen_submission_uses_the_existing_default_priority(): void
    {
        $this->authenticateAs(self::CITIZEN_ID);
        $this->mockStorage();

        $response = $this->postJson(
            '/api/complaints',
            $this->citizenComplaintPayload()
        );

        $response->assertCreated()
            ->assertJsonPath('complaint.priority', 'medium')
            ->assertJsonPath('complaint.status', 'submitted')
            ->assertJsonPath('complaint.is_anonymous', false);
        $this->assertDatabaseHas('complaints', [
            'id' => $response->json('complaint.id'),
            'priority' => 'medium',
            'is_anonymous' => false,
        ]);
    }

    public function test_citizen_can_submit_an_incident_in_another_barangay(): void
    {
        $this->authenticateAs(self::CITIZEN_ID);
        $this->mockStorage();

        $response = $this->postJson(
            '/api/complaints',
            $this->citizenComplaintPayload(['barangay_id' => self::OTHER_BARANGAY_ID])
        );

        $response->assertCreated()
            ->assertJsonPath('complaint.barangay_id', self::OTHER_BARANGAY_ID)
            ->assertJsonPath('complaint.citizen_id', self::CITIZEN_ID);
        $this->assertDatabaseHas('complaints', [
            'id' => $response->json('complaint.id'),
            'barangay_id' => self::OTHER_BARANGAY_ID,
            'citizen_id' => self::CITIZEN_ID,
        ]);
    }

    public function test_citizen_submission_accepts_a_5000_character_description(): void
    {
        $this->authenticateAs(self::CITIZEN_ID);
        $this->mockStorage();

        $description = str_repeat('a', 5000);
        $response = $this->postJson(
            '/api/complaints',
            $this->citizenComplaintPayload(['description' => $description])
        );

        $response->assertCreated()
            ->assertJsonPath('complaint.description', $description);
        $this->assertDatabaseHas('complaints', [
            'id' => $response->json('complaint.id'),
            'description' => $description,
        ]);
    }

    public function test_citizen_submission_rejects_a_5001_character_description(): void
    {
        $this->authenticateAs(self::CITIZEN_ID);
        $this->mockStorage();

        $response = $this->postJson(
            '/api/complaints',
            $this->citizenComplaintPayload(['description' => str_repeat('a', 5001)])
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('description');
        $this->assertDatabaseCount('complaints', 0);
    }

    public function test_anonymous_submission_keeps_authenticated_citizen_as_owner(): void
    {
        $this->authenticateAs(self::CITIZEN_ID);
        $this->mockStorage();

        $response = $this->postJson('/api/complaints', $this->citizenComplaintPayload([
            'is_anonymous' => true,
            'citizen_id' => self::STAFF_ID,
        ]));

        $response->assertCreated()
            ->assertJsonPath('complaint.is_anonymous', true)
            ->assertJsonPath('complaint.citizen_id', self::CITIZEN_ID);
        $this->assertDatabaseHas('complaints', [
            'id' => $response->json('complaint.id'),
            'is_anonymous' => true,
            'citizen_id' => self::CITIZEN_ID,
        ]);
    }

    public function test_citizen_cannot_set_priority_during_submission(): void
    {
        $this->authenticateAs(self::CITIZEN_ID);
        $this->mockStorage();

        $response = $this->postJson(
            '/api/complaints',
            $this->citizenComplaintPayload(['priority' => 'urgent'])
        );

        $response->assertCreated()
            ->assertJsonPath('complaint.priority', 'medium');
        $this->assertDatabaseHas('complaints', [
            'id' => $response->json('complaint.id'),
            'priority' => 'medium',
        ]);
    }

    public function test_citizen_cannot_assign_priority_through_staff_review_route(): void
    {
        $complaint = $this->createComplaint();
        $this->authenticateAs(self::CITIZEN_ID);

        $this->postJson("/api/complaints/{$complaint->id}/review", [
            'decision' => 'start_review',
            'priority' => 'urgent',
        ])->assertForbidden();

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'submitted',
            'priority' => 'medium',
        ]);
    }

    public function test_lgu_staff_assigns_priority_when_starting_review(): void
    {
        $complaint = $this->createComplaint();
        $this->authenticateAs(self::STAFF_ID);

        $response = $this->postJson("/api/complaints/{$complaint->id}/review", [
            'decision' => 'start_review',
            'priority' => 'high',
        ]);

        $response->assertOk()
            ->assertJsonPath('complaint.status', 'under_review')
            ->assertJsonPath('complaint.priority', 'high');
        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'under_review',
            'priority' => 'high',
        ]);
    }

    public function test_lgu_staff_can_update_priority_while_completing_review(): void
    {
        $complaint = $this->createComplaint('under_review');
        $this->authenticateAs(self::STAFF_ID);

        $response = $this->postJson("/api/complaints/{$complaint->id}/review", [
            'decision' => 'accepted',
            'resolution_level' => 'barangay',
            'priority' => 'urgent',
        ]);

        $response->assertOk()
            ->assertJsonPath('complaint.status', 'accepted')
            ->assertJsonPath('complaint.priority', 'urgent')
            ->assertJsonPath('complaint.resolution_level', 'barangay');
        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'accepted',
            'priority' => 'urgent',
            'resolution_level' => 'barangay',
        ]);
    }

    public function test_invalid_priority_is_rejected_without_changing_review_state(): void
    {
        $complaint = $this->createComplaint();
        $this->authenticateAs(self::STAFF_ID);

        $this->postJson("/api/complaints/{$complaint->id}/review", [
            'decision' => 'start_review',
            'priority' => 'critical',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('priority');

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'submitted',
            'priority' => 'medium',
        ]);
    }

    public function test_lgu_staff_must_select_priority_when_starting_review(): void
    {
        $complaint = $this->createComplaint();
        $this->authenticateAs(self::STAFF_ID);

        $this->postJson("/api/complaints/{$complaint->id}/review", [
            'decision' => 'start_review',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('priority');
    }

    public function test_non_lgu_staff_cannot_assign_priority_in_review(): void
    {
        $complaint = $this->createComplaint();
        $this->authenticateAs(self::DEPARTMENT_HEAD_ID);

        $this->postJson("/api/complaints/{$complaint->id}/review", [
            'decision' => 'start_review',
            'priority' => 'high',
        ])->assertForbidden();

        $this->assertDatabaseHas('complaints', [
            'id' => $complaint->id,
            'status' => 'submitted',
            'priority' => 'medium',
        ]);
    }
}
