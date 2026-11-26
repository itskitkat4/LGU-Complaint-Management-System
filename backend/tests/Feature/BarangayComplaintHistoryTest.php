<?php

namespace Tests\Feature;

use App\Models\Profile;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BarangayComplaintHistoryTest extends TestCase
{
    private const HEAD_ID = '11111111-1111-4111-8111-111111111111';
    private const OTHER_HEAD_ID = '22222222-2222-4222-8222-222222222222';
    private const CITIZEN_ID = '33333333-3333-4333-8333-333333333333';
    private const BARANGAY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const OTHER_BARANGAY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    private const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    private int $complaintSequence = 1;
    private int $assignmentSequence = 1;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email')->unique();
            $table->string('role');
            $table->uuid('barangay_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('barangays', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
        });

        Schema::create('complaint_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
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

        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
        });

        DB::table('barangays')->insert([
            ['id' => self::BARANGAY_ID, 'name' => 'Barangay One'],
            ['id' => self::OTHER_BARANGAY_ID, 'name' => 'Barangay Two'],
        ]);
        DB::table('complaint_categories')->insert([
            'id' => self::CATEGORY_ID,
            'name' => 'Roads',
        ]);

        $this->createProfile(self::HEAD_ID, 'Barangay_Head', self::BARANGAY_ID);
        $this->createProfile(self::OTHER_HEAD_ID, 'Barangay_Head', self::OTHER_BARANGAY_ID);
        $this->createProfile(self::CITIZEN_ID, 'citizen');

        Http::fake(function ($request) {
            $authorization = $request->header('Authorization');
            $authorization = is_array($authorization) ? ($authorization[0] ?? '') : $authorization;
            $id = $this->syntheticSupabaseSubject($authorization);

            return Http::response([
                'id' => $id,
                'email' => $id . '@example.com',
                'app_metadata' => ['bantayserbisyo_password_setup_completed' => true],
            ], 200);
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('complaint_escalations');
        Schema::dropIfExists('complaint_assignments');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('complaint_categories');
        Schema::dropIfExists('departments');
        Schema::dropIfExists('barangays');
        Schema::dropIfExists('profiles');

        parent::tearDown();
    }

    public function test_history_includes_ended_and_current_complaints_for_the_heads_barangay_only(): void
    {
        $endedComplaint = $this->createComplaint('resolved', self::BARANGAY_ID);
        $this->createAssignment($endedComplaint, self::HEAD_ID, now()->toDateTimeString());

        $currentComplaint = $this->createComplaint('assigned', self::BARANGAY_ID);
        $this->createAssignment($currentComplaint, self::HEAD_ID);

        $this->createComplaint('declined', self::BARANGAY_ID);
        $this->createComplaint('in_progress', self::OTHER_BARANGAY_ID);

        $response = $this->getAs(self::HEAD_ID, '/api/barangay/complaints/history');

        $response->assertOk()
            ->assertJsonPath('pagination.total', 3)
            ->assertJsonCount(3, 'data');

        $records = collect($response->json('data'))->keyBy('id');
        $this->assertArrayHasKey($endedComplaint, $records);
        $this->assertArrayHasKey($currentComplaint, $records);
        $this->assertSame(
            self::BARANGAY_ID,
            $records[$endedComplaint]['barangay_id']
        );
        $this->assertSame('Roads', $records[$endedComplaint]['category']['name']);
    }

    public function test_newly_assigned_complaints_are_in_history_and_current_queue_stays_active_only(): void
    {
        $activeComplaint = $this->createComplaint('assigned', self::BARANGAY_ID);
        $this->createAssignment($activeComplaint, self::HEAD_ID);

        $endedComplaint = $this->createComplaint('resolved', self::BARANGAY_ID);
        $this->createAssignment($endedComplaint, self::HEAD_ID, now()->toDateTimeString());

        $otherHeadComplaint = $this->createComplaint('in_progress', self::BARANGAY_ID);
        $this->createAssignment($otherHeadComplaint, self::OTHER_HEAD_ID);

        $this->getAs(self::HEAD_ID, '/api/barangay/complaints/history')
            ->assertOk()
            ->assertJsonPath('pagination.total', 3);

        $queueResponse = $this->getAs(self::HEAD_ID, '/api/barangay/complaints');

        $queueResponse->assertOk()
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.id', $activeComplaint);
    }

    public function test_history_filters_by_lifecycle_status_and_supports_pagination(): void
    {
        for ($index = 0; $index < 11; $index++) {
            $this->createComplaint(
                $index === 0 ? 'resolved' : 'submitted',
                self::BARANGAY_ID
            );
        }

        $this->getAs(self::HEAD_ID, '/api/barangay/complaints/history?page=2')
            ->assertOk()
            ->assertJsonPath('pagination.current_page', 2)
            ->assertJsonPath('pagination.last_page', 2)
            ->assertJsonPath('pagination.per_page', 10)
            ->assertJsonPath('pagination.total', 11)
            ->assertJsonCount(1, 'data');

        $this->getAs(
            self::HEAD_ID,
            '/api/barangay/complaints/history?status=resolved'
        )
            ->assertOk()
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.status', 'resolved');
    }

    public function test_barangay_complaint_queue_and_history_redact_anonymous_citizen_identity(): void
    {
        $complaintId = $this->createComplaint('assigned', self::BARANGAY_ID);

        DB::table('complaints')
            ->where('id', $complaintId)
            ->update(['is_anonymous' => true]);

        $this->createAssignment($complaintId, self::HEAD_ID);

        $queueResponse = $this->getAs(self::HEAD_ID, '/api/barangay/complaints');

        $queueResponse->assertOk()
            ->assertJsonPath('data.0.id', $complaintId)
            ->assertJsonPath('data.0.is_anonymous', true)
            ->assertJsonMissingPath('data.0.citizen_id')
            ->assertJsonMissingPath('data.0.citizen');

        $historyResponse = $this->getAs(
            self::HEAD_ID,
            '/api/barangay/complaints/history'
        );

        $historyResponse->assertOk()
            ->assertJsonPath('data.0.id', $complaintId)
            ->assertJsonPath('data.0.is_anonymous', true)
            ->assertJsonMissingPath('data.0.citizen_id')
            ->assertJsonMissingPath('data.0.citizen');
    }
    public function test_history_requires_barangay_head_authorization(): void
    {
        $this->getJson('/api/barangay/complaints/history')->assertUnauthorized();

        $this->getAs(self::CITIZEN_ID, '/api/barangay/complaints/history')
            ->assertForbidden();
    }

    private function createProfile(string $id, string $role, ?string $barangayId = null): void
    {
        Profile::create([
            'id' => $id,
            'full_name' => $role,
            'email' => $id . '@example.com',
            'role' => $role,
            'barangay_id' => $barangayId,
            'is_active' => true,
        ]);
    }

    private function createComplaint(string $status, string $barangayId): string
    {
        $id = sprintf('eeeeeeee-eeee-4eee-8eee-%012d', $this->complaintSequence++);
        DB::table('complaints')->insert([
            'id' => $id,
            'citizen_id' => self::CITIZEN_ID,
            'category_id' => self::CATEGORY_ID,
            'barangay_id' => $barangayId,
            'title' => 'Complaint ' . $this->complaintSequence,
            'description' => 'Test complaint description.',
            'priority' => 'medium',
            'status' => $status,
            'created_at' => now()->addSeconds($this->complaintSequence),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function createAssignment(
        string $complaintId,
        string $assignedTo,
        ?string $endedAt = null
    ): void {
        DB::table('complaint_assignments')->insert([
            'id' => sprintf('ffffffff-ffff-4fff-8fff-%012d', $this->assignmentSequence++),
            'complaint_id' => $complaintId,
            'assigned_to' => $assignedTo,
            'assigned_by' => self::HEAD_ID,
            'assignment_level' => 'barangay',
            'barangay_id' => self::BARANGAY_ID,
            'assigned_at' => now(),
            'ended_at' => $endedAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function getAs(string $id, string $uri)
    {
        return $this->withToken($this->syntheticSupabaseToken($id, ['password']))->getJson($uri);
    }
}
