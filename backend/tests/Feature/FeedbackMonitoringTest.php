<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class FeedbackMonitoringTest extends TestCase
{
    private const STAFF = '11111111-1111-4111-8111-111111111111';
    private const BARANGAY_HEAD = '22222222-2222-4222-8222-222222222222';
    private const OTHER_BARANGAY_HEAD = '23232323-2323-4232-8232-232323232323';
    private const DEPARTMENT_HEAD = '33333333-3333-4333-8333-333333333333';
    private const OTHER_DEPARTMENT_HEAD = '34343434-3434-4343-8434-343434343434';
    private const PERSONNEL = '44444444-4444-4444-8444-444444444444';
    private const OTHER_PERSONNEL = '45454545-4545-4545-8545-454545454545';
    private const CITIZEN = '55555555-5555-4555-8555-555555555555';
    private const OTHER_CITIZEN = '56565656-5656-4656-8656-565656565656';
    private const BARANGAY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const OTHER_BARANGAY = 'abababab-abab-4bab-8bab-abababababab';
    private const DEPARTMENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    private const OTHER_DEPARTMENT = 'bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc';

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
        });
        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
        });
        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id');
            $table->boolean('is_anonymous')->default(false);
            $table->uuid('barangay_id')->nullable();
            $table->string('title');
            $table->string('resolution_level');
            $table->string('status');
            $table->timestamps();
        });
        Schema::create('complaint_resolutions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('submitted_by');
            $table->string('review_status');
            $table->timestamp('submitted_at');
            $table->timestamp('reviewed_at')->nullable();
        });
        Schema::create('complaint_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('assigned_to');
            $table->string('assignment_level');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('ended_at')->nullable();
        });
        Schema::create('feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id')->unique();
            $table->uuid('citizen_id');
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->timestamps();
        });

        DB::table('barangays')->insert([
            ['id' => self::BARANGAY, 'name' => 'North Barangay'],
            ['id' => self::OTHER_BARANGAY, 'name' => 'South Barangay'],
        ]);
        DB::table('departments')->insert([
            ['id' => self::DEPARTMENT, 'name' => 'Public Works'],
            ['id' => self::OTHER_DEPARTMENT, 'name' => 'Health'],
        ]);
        $this->profile(self::STAFF, 'LGU-Staff');
        $this->profile(self::BARANGAY_HEAD, 'Barangay_Head', self::BARANGAY);
        $this->profile(self::OTHER_BARANGAY_HEAD, 'Barangay_Head', self::OTHER_BARANGAY);
        $this->profile(self::DEPARTMENT_HEAD, 'Department_Head', null, self::DEPARTMENT);
        $this->profile(self::OTHER_DEPARTMENT_HEAD, 'Department_Head', null, self::OTHER_DEPARTMENT);
        $this->profile(self::PERSONNEL, 'Department_Personnel', null, self::DEPARTMENT);
        $this->profile(self::OTHER_PERSONNEL, 'Department_Personnel', null, self::OTHER_DEPARTMENT);
        $this->profile(self::CITIZEN, 'citizen');
        $this->profile(self::OTHER_CITIZEN, 'citizen');

        $this->feedbackCase('1', 'barangay', self::BARANGAY, self::BARANGAY_HEAD, null, 5, self::CITIZEN);
        $this->feedbackCase('2', 'barangay', self::OTHER_BARANGAY, self::OTHER_BARANGAY_HEAD, null, 1, self::OTHER_CITIZEN);
        $this->feedbackCase('3', 'lgu', null, self::PERSONNEL, self::DEPARTMENT, 3, self::CITIZEN);
        $this->feedbackCase('4', 'lgu', null, self::OTHER_PERSONNEL, self::OTHER_DEPARTMENT, 4, self::OTHER_CITIZEN);
    }

    private function profile(string $id, string $role, ?string $barangayId = null, ?string $departmentId = null): void
    {
        DB::table('profiles')->insert([
            'id' => $id,
            'full_name' => $role . ' ' . substr($id, 0, 4),
            'email' => $id . '@example.com',
            'role' => $role,
            'barangay_id' => $barangayId,
            'department_id' => $departmentId,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function feedbackCase(string $suffix, string $level, ?string $barangayId, string $handlerId, ?string $departmentId, int $rating, string $citizenId): void
    {
        $complaintId = sprintf('cccccccc-cccc-4ccc-8ccc-%012d', (int) $suffix);
        $now = now();
        DB::table('complaints')->insert([
            'id' => $complaintId,
            'citizen_id' => $citizenId,
            'is_anonymous' => $suffix === '1',
            'barangay_id' => $barangayId,
            'title' => 'Complaint ' . $suffix,
            'resolution_level' => $level,
            'status' => 'resolved',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('complaint_resolutions')->insert([
            'id' => sprintf('dddddddd-dddd-4ddd-8ddd-%012d', (int) $suffix),
            'complaint_id' => $complaintId,
            'submitted_by' => $handlerId,
            'review_status' => 'approved',
            'submitted_at' => $now,
            'reviewed_at' => $now,
        ]);
        DB::table('complaint_assignments')->insert([
            'id' => sprintf('eeeeeeee-eeee-4eee-8eee-%012d', (int) $suffix),
            'complaint_id' => $complaintId,
            'assigned_to' => $handlerId,
            'assignment_level' => $level,
            'barangay_id' => $barangayId,
            'department_id' => $departmentId,
            'assigned_at' => $now,
            'ended_at' => $now,
        ]);
        DB::table('feedback')->insert([
            'id' => sprintf('ffffffff-ffff-4fff-8fff-%012d', (int) $suffix),
            'complaint_id' => $complaintId,
            'citizen_id' => $citizenId,
            'rating' => $rating,
            'comment' => 'Feedback comment ' . $suffix,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function authenticateAs(string $profileId): void
    {
        Http::fake(['*' => Http::response([
            'id' => $profileId,
            'email' => $profileId . '@example.com',
            'app_metadata' => ['bantayserbisyo_password_setup_completed' => true],
        ], 200)]);
        $this->withToken($this->syntheticSupabaseToken($profileId, ['password']));
    }

    public function test_lgu_staff_can_monitor_all_feedback_and_filter_by_department_and_rating(): void
    {
        $this->authenticateAs(self::STAFF);
        $this->getJson('/api/feedback')
            ->assertOk()
            ->assertJsonPath('statistics.total_feedback', 4)
            ->assertJsonPath('statistics.average_rating', 3.25)
            ->assertJsonCount(4, 'data');

        $this->getJson('/api/feedback?department_id=' . self::DEPARTMENT . '&rating=3')
            ->assertOk()
            ->assertJsonPath('statistics.total_feedback', 1)
            ->assertJsonPath('data.0.department_name', 'Public Works')
            ->assertJsonPath('data.0.handler_id', self::PERSONNEL);

        $this->getJson('/api/feedback?rating=5')
            ->assertOk()
            ->assertJsonPath('data.0.citizen_id', null)
            ->assertJsonPath('data.0.citizen_name', null);
    }

    public function test_repeated_approved_resolution_and_assignment_rows_do_not_duplicate_feedback(): void
    {
        $complaintId = 'cccccccc-cccc-4ccc-8ccc-000000000001';
        DB::table('complaint_resolutions')->insert([
            'id' => 'dddddddd-dddd-4ddd-8ddd-000000000099',
            'complaint_id' => $complaintId,
            'submitted_by' => self::BARANGAY_HEAD,
            'review_status' => 'approved',
            'submitted_at' => now(),
            'reviewed_at' => now()->addSecond(),
        ]);
        DB::table('complaint_assignments')->insert([
            'id' => 'ffffffff-ffff-4fff-8fff-eeeeeeeeeeee',
            'complaint_id' => $complaintId,
            'assigned_to' => self::BARANGAY_HEAD,
            'assignment_level' => 'barangay',
            'barangay_id' => self::BARANGAY,
            'department_id' => null,
            'assigned_at' => now(),
            'ended_at' => now()->addSecond(),
        ]);

        $this->authenticateAs(self::STAFF);
        $this->getJson('/api/feedback')
            ->assertOk()
            ->assertJsonPath('statistics.total_feedback', 4)
            ->assertJsonPath('statistics.average_rating', 3.25)
            ->assertJsonCount(4, 'data');
    }

    public function test_empty_feedback_filter_returns_zero_statistics(): void
    {
        $this->authenticateAs(self::STAFF);
        $this->getJson('/api/feedback?rating=2')
            ->assertOk()
            ->assertJsonPath('statistics.total_feedback', 0)
            ->assertJsonPath('statistics.average_rating', 0)
            ->assertJsonPath('statistics.positive_ratings', 0)
            ->assertJsonPath('statistics.negative_ratings', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_feedback_statistics_are_not_limited_by_listing_pagination(): void
    {
        for ($index = 5; $index <= 14; $index++) {
            $this->feedbackCase((string) $index, 'lgu', null, self::PERSONNEL, self::DEPARTMENT, 4, self::CITIZEN);
        }

        $this->authenticateAs(self::STAFF);
        $this->getJson('/api/feedback?page=1')
            ->assertOk()
            ->assertJsonPath('statistics.total_feedback', 14)
            ->assertJsonPath('statistics.average_rating', 3.79)
            ->assertJsonPath('pagination.total', 14)
            ->assertJsonCount(10, 'data');
        $this->getJson('/api/feedback?page=2')
            ->assertOk()
            ->assertJsonPath('statistics.total_feedback', 14)
            ->assertJsonPath('pagination.total', 14)
            ->assertJsonCount(4, 'data');
    }

    public function test_barangay_head_only_sees_feedback_for_their_barangay(): void
    {
        $this->authenticateAs(self::BARANGAY_HEAD);
        $this->getJson('/api/feedback')
            ->assertOk()
            ->assertJsonPath('statistics.total_feedback', 1)
            ->assertJsonPath('data.0.barangay_id', self::BARANGAY)
            ->assertJsonPath('data.0.handling_unit', 'barangay');
        $this->getJson('/api/feedback?barangay_id=' . self::OTHER_BARANGAY)
            ->assertOk()->assertJsonPath('statistics.total_feedback', 0);
    }

    public function test_department_head_only_sees_feedback_for_their_department(): void
    {
        $this->authenticateAs(self::DEPARTMENT_HEAD);
        $this->getJson('/api/feedback')
            ->assertOk()
            ->assertJsonPath('statistics.total_feedback', 1)
            ->assertJsonPath('data.0.department_id', self::DEPARTMENT)
            ->assertJsonPath('data.0.handler_id', self::PERSONNEL);
        $this->getJson('/api/feedback?department_id=' . self::OTHER_DEPARTMENT)
            ->assertOk()->assertJsonPath('statistics.total_feedback', 0);
    }

    public function test_department_personnel_cannot_access_feedback_monitoring(): void
    {
        $this->authenticateAs(self::PERSONNEL);
        $this->getJson('/api/feedback')->assertForbidden();
    }

    public function test_citizen_feedback_response_includes_nested_complaint_anonymity_flag(): void
    {
        $this->authenticateAs(self::CITIZEN);

        $response = $this->getJson('/api/feedback')
            ->assertOk();

        $data = $response->json('data');

        $this->assertCount(2, $data);

        $anonymousFeedback = collect($data)->firstWhere(
            'complaint_id',
            'cccccccc-cccc-4ccc-8ccc-000000000001'
        );

        $this->assertNotNull($anonymousFeedback);
        $this->assertIsArray($anonymousFeedback['complaint']);

        $complaint = $anonymousFeedback['complaint'];

        $this->assertTrue($complaint['is_anonymous']);
        $this->assertArrayNotHasKey('citizen_id', $complaint);
        $this->assertArrayNotHasKey('citizen', $complaint);
    }
    public function test_citizen_can_only_view_their_own_feedback_records(): void
    {
        $this->authenticateAs(self::CITIZEN);
        $this->getJson('/api/feedback')
            ->assertOk()
            ->assertJsonPath('statistics.total_feedback', 2)
            ->assertJsonCount(2, 'data')
            ->assertJsonMissing(['citizen_id' => self::OTHER_CITIZEN]);
    }
}
