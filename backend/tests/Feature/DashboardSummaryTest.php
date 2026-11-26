<?php

namespace Tests\Feature;

use App\Models\Profile;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DashboardSummaryTest extends TestCase
{
    private const STAFF_ID = '11111111-1111-4111-8111-111111111111';
    private const BARANGAY_HEAD_ID = '22222222-2222-4222-8222-222222222222';
    private const OTHER_BARANGAY_HEAD_ID = '33333333-3333-4333-8333-333333333333';
    private const PERSONNEL_ID = '44444444-4444-4444-8444-444444444444';
    private const OTHER_PERSONNEL_ID = '55555555-5555-4555-8555-555555555555';
    private const CITIZEN_ID = '66666666-6666-4666-8666-666666666666';
    private const ADMIN_ID = '77777777-7777-4777-8777-777777777777';
    private const DEPARTMENT_HEAD_ID = '88888888-8888-4888-8888-888888888888';
    private const BARANGAY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const OTHER_BARANGAY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    private const DEPARTMENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    private const OTHER_DEPARTMENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

    private int $complaintSequence = 1;
    private int $assignmentSequence = 1;
    private int $resolutionSequence = 1;

    protected function setUp(): void
    {
        parent::setUp();

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
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('complaint_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('assigned_to');
            $table->string('assignment_level');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->timestamp('ended_at')->nullable();
        });

        Schema::create('complaint_resolutions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('submitted_by');
            $table->string('review_status');
            $table->timestamp('submitted_at');
            $table->timestamp('created_at');
        });

        Schema::create('barangays', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
        });

        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
        });

        $this->createProfile(self::STAFF_ID, 'LGU-Staff');
        $this->createProfile(self::BARANGAY_HEAD_ID, 'Barangay_Head', self::BARANGAY_ID);
        $this->createProfile(self::OTHER_BARANGAY_HEAD_ID, 'Barangay_Head', self::OTHER_BARANGAY_ID);
        $this->createProfile(self::PERSONNEL_ID, 'Department_Personnel', null, self::DEPARTMENT_ID);
        $this->createProfile(self::OTHER_PERSONNEL_ID, 'Department_Personnel', null, self::OTHER_DEPARTMENT_ID);
        $this->createProfile(self::CITIZEN_ID, 'citizen');
        $this->createProfile(self::ADMIN_ID, 'System Administrator');
        $this->createProfile(self::DEPARTMENT_HEAD_ID, 'Department_Head', null, self::DEPARTMENT_ID);

        Http::fake(function ($request) {
            $authorization = $request->header('Authorization');
            $token = is_array($authorization) ? ($authorization[0] ?? '') : $authorization;
            $id = $this->syntheticSupabaseSubject($token);

            return Http::response([
                'id' => $id,
                'email' => $id . '@example.com',
                'app_metadata' => ['bantayserbisyo_password_setup_completed' => true],
            ], 200);
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('complaint_resolutions');
        Schema::dropIfExists('complaint_assignments');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('departments');
        Schema::dropIfExists('barangays');
        Schema::dropIfExists('profiles');

        parent::tearDown();
    }

    public function test_lgu_staff_summary_counts_all_complaint_statuses_and_pending_resolutions(): void
    {
        foreach ([
            'submitted',
            'under_review',
            'accepted',
            'declined',
            'assigned',
            'in_progress',
            'resolved',
        ] as $status) {
            $complaintId = $this->createComplaint($status);
            if ($status === 'in_progress') {
                $this->createResolution($complaintId, 'pending_review');
            }
        }

        $response = $this->getAs(self::STAFF_ID, '/api/staff/dashboard-summary');

        $response->assertOk()
            ->assertJsonPath('statistics.total_complaints', 7)
            ->assertJsonPath('statistics.submitted', 1)
            ->assertJsonPath('statistics.under_review', 1)
            ->assertJsonPath('statistics.accepted', 1)
            ->assertJsonPath('statistics.declined', 1)
            ->assertJsonPath('statistics.assigned', 1)
            ->assertJsonPath('statistics.in_progress', 1)
            ->assertJsonPath('statistics.resolved', 1)
            ->assertJsonPath('statistics.resolutions_pending_review', 1);
    }

    public function test_dashboard_summaries_return_zero_counts_when_no_records_are_in_scope(): void
    {
        $this->getAs(self::STAFF_ID, '/api/staff/dashboard-summary')
            ->assertOk()
            ->assertJsonPath('statistics.total_complaints', 0)
            ->assertJsonPath('statistics.submitted', 0)
            ->assertJsonPath('statistics.resolutions_pending_review', 0);

        $barangayResponse = $this->getAs(self::BARANGAY_HEAD_ID, '/api/barangay/dashboard-summary');
        $this->assertSame(200, $barangayResponse->status(), $barangayResponse->getContent());
        $barangayResponse
            ->assertJsonPath('statistics.total_complaints', 0)
            ->assertJsonPath('statistics.in_progress', 0)
            ->assertJsonPath('statistics.returned_for_follow_up', 0);

        $this->getAs(self::PERSONNEL_ID, '/api/department/personnel/dashboard-summary')
            ->assertOk()
            ->assertJsonPath('statistics.my_assignments', 0)
            ->assertJsonPath('statistics.in_progress', 0)
            ->assertJsonPath('statistics.resolutions_pending_review', 0)
            ->assertJsonPath('statistics.returned_for_follow_up', 0);
    }

    public function test_barangay_summary_is_scoped_to_the_heads_active_barangay_assignments(): void
    {
        $ownComplaint = $this->createComplaint('in_progress');
        $this->createAssignment(
            $ownComplaint,
            self::BARANGAY_HEAD_ID,
            'barangay',
            self::BARANGAY_ID
        );
        $this->createResolution($ownComplaint, 'returned');

        $otherBarangayComplaint = $this->createComplaint('resolved');
        $this->createAssignment(
            $otherBarangayComplaint,
            self::BARANGAY_HEAD_ID,
            'barangay',
            self::OTHER_BARANGAY_ID
        );

        $otherHeadComplaint = $this->createComplaint('assigned');
        $this->createAssignment(
            $otherHeadComplaint,
            self::OTHER_BARANGAY_HEAD_ID,
            'barangay',
            self::BARANGAY_ID
        );

        $endedAssignmentComplaint = $this->createComplaint('assigned');
        $this->createAssignment(
            $endedAssignmentComplaint,
            self::BARANGAY_HEAD_ID,
            'barangay',
            self::BARANGAY_ID,
            null,
            now()->toDateTimeString()
        );

        $response = $this->getAs(
            self::BARANGAY_HEAD_ID,
            '/api/barangay/dashboard-summary'
        );

        $response->assertOk()
            ->assertJsonPath('statistics.total_complaints', 1)
            ->assertJsonPath('statistics.in_progress', 1)
            ->assertJsonPath('statistics.resolved', 0)
            ->assertJsonPath('statistics.returned_for_follow_up', 1);
    }

    public function test_personnel_summary_is_scoped_and_counts_only_latest_returned_resolution(): void
    {
        $returnedComplaint = $this->createComplaint('in_progress');
        $this->createAssignment(
            $returnedComplaint,
            self::PERSONNEL_ID,
            'lgu',
            null,
            self::DEPARTMENT_ID
        );
        $this->createResolution($returnedComplaint, 'returned', '2026-11-01 10:00:00');

        $pendingComplaint = $this->createComplaint('in_progress');
        $this->createAssignment(
            $pendingComplaint,
            self::PERSONNEL_ID,
            'lgu',
            null,
            self::DEPARTMENT_ID
        );
        $this->createResolution($pendingComplaint, 'returned', '2026-11-01 10:00:00');
        $this->createResolution($pendingComplaint, 'pending_review', '2026-11-02 10:00:00');

        $otherPersonnelComplaint = $this->createComplaint('in_progress');
        $this->createAssignment(
            $otherPersonnelComplaint,
            self::OTHER_PERSONNEL_ID,
            'lgu',
            null,
            self::DEPARTMENT_ID
        );
        $this->createResolution($otherPersonnelComplaint, 'pending_review');

        $otherDepartmentComplaint = $this->createComplaint('assigned');
        $this->createAssignment(
            $otherDepartmentComplaint,
            self::PERSONNEL_ID,
            'lgu',
            null,
            self::OTHER_DEPARTMENT_ID
        );

        $endedAssignmentComplaint = $this->createComplaint('assigned');
        $this->createAssignment(
            $endedAssignmentComplaint,
            self::PERSONNEL_ID,
            'lgu',
            null,
            self::DEPARTMENT_ID,
            now()->toDateTimeString()
        );

        $response = $this->getAs(
            self::PERSONNEL_ID,
            '/api/department/personnel/dashboard-summary'
        );

        $response->assertOk()
            ->assertJsonPath('statistics.my_assignments', 2)
            ->assertJsonPath('statistics.in_progress', 2)
            ->assertJsonPath('statistics.resolutions_pending_review', 1)
            ->assertJsonPath('statistics.returned_for_follow_up', 1);
    }

    public function test_personnel_pending_resolution_count_is_limited_to_the_authenticated_submitter(): void
    {
        $ownComplaint = $this->createComplaint('in_progress');
        $this->createAssignment(
            $ownComplaint,
            self::PERSONNEL_ID,
            'lgu',
            null,
            self::DEPARTMENT_ID
        );
        $this->createResolution(
            $ownComplaint,
            'pending_review',
            null,
            self::PERSONNEL_ID
        );
        $this->createResolution(
            $ownComplaint,
            'pending_review',
            null,
            self::OTHER_PERSONNEL_ID
        );

        $reassignedComplaint = $this->createComplaint('in_progress');
        $this->createAssignment(
            $reassignedComplaint,
            self::OTHER_PERSONNEL_ID,
            'lgu',
            null,
            self::OTHER_DEPARTMENT_ID,
            now()->toDateTimeString()
        );
        $this->createAssignment(
            $reassignedComplaint,
            self::PERSONNEL_ID,
            'lgu',
            null,
            self::DEPARTMENT_ID
        );
        $this->createResolution(
            $reassignedComplaint,
            'pending_review',
            null,
            self::OTHER_PERSONNEL_ID
        );

        $outOfScopeComplaint = $this->createComplaint('in_progress');
        $this->createAssignment(
            $outOfScopeComplaint,
            self::OTHER_PERSONNEL_ID,
            'lgu',
            null,
            self::DEPARTMENT_ID
        );
        $this->createResolution(
            $outOfScopeComplaint,
            'pending_review',
            null,
            self::PERSONNEL_ID
        );

        $this->getAs(
            self::PERSONNEL_ID,
            '/api/department/personnel/dashboard-summary'
        )
            ->assertOk()
            ->assertJsonPath('statistics.my_assignments', 2)
            ->assertJsonPath('statistics.resolutions_pending_review', 1);
    }

    public function test_dashboard_summary_endpoints_reject_unauthorized_roles(): void
    {
        $this->getJson('/api/staff/dashboard-summary')->assertUnauthorized();

        $this->getAs(self::CITIZEN_ID, '/api/staff/dashboard-summary')
            ->assertForbidden();
        $this->getAs(self::CITIZEN_ID, '/api/barangay/dashboard-summary')
            ->assertForbidden();
        $this->getAs(self::CITIZEN_ID, '/api/department/personnel/dashboard-summary')
            ->assertForbidden();
    }

    public function test_dashboard_summary_endpoints_enforce_the_role_authorization_matrix(): void
    {
        $endpoints = [
            '/api/admin/dashboard-summary' => [
                'System Administrator' => self::ADMIN_ID,
            ],
            '/api/staff/dashboard-summary' => [
                'LGU-Staff' => self::STAFF_ID,
            ],
            '/api/barangay/dashboard-summary' => [
                'Barangay_Head' => self::BARANGAY_HEAD_ID,
            ],
            '/api/department/personnel/dashboard-summary' => [
                'Department_Personnel' => self::PERSONNEL_ID,
            ],
        ];
        $profiles = [
            'System Administrator' => self::ADMIN_ID,
            'LGU-Staff' => self::STAFF_ID,
            'Barangay_Head' => self::BARANGAY_HEAD_ID,
            'Department_Personnel' => self::PERSONNEL_ID,
            'Department_Head' => self::DEPARTMENT_HEAD_ID,
            'citizen' => self::CITIZEN_ID,
        ];

        foreach ($endpoints as $endpoint => $allowedRoles) {
            foreach ($profiles as $role => $profileId) {
                $response = $this->getAs($profileId, $endpoint);
                $expectedStatus = isset($allowedRoles[$role]) ? 200 : 403;

                $this->assertSame(
                    $expectedStatus,
                    $response->status(),
                    "{$role} received an unexpected response from {$endpoint}."
                );
            }
        }
    }

    public function test_admin_summary_returns_root_level_database_aggregates(): void
    {
        $this->createComplaint('submitted');
        $this->createComplaint('resolved');
        DB::table('barangays')->insert([
            'id' => self::BARANGAY_ID,
            'name' => 'Barangay One',
        ]);
        DB::table('departments')->insert([
            'id' => self::DEPARTMENT_ID,
            'name' => 'Department One',
        ]);

        $this->getAs(self::ADMIN_ID, '/api/admin/dashboard-summary')
            ->assertOk()
            ->assertExactJson([
                'users' => 8,
                'complaints' => 2,
                'barangays' => 1,
                'departments' => 1,
            ]);
    }

    private function createProfile(
        string $id,
        string $role,
        ?string $barangayId = null,
        ?string $departmentId = null
    ): void {
        Profile::create([
            'id' => $id,
            'full_name' => $role,
            'email' => $id . '@example.com',
            'role' => $role,
            'barangay_id' => $barangayId,
            'department_id' => $departmentId,
            'is_active' => true,
        ]);
    }

    private function createComplaint(string $status): string
    {
        $id = sprintf('eeeeeeee-eeee-4eee-8eee-%012d', $this->complaintSequence++);
        DB::table('complaints')->insert([
            'id' => $id,
            'citizen_id' => self::CITIZEN_ID,
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function createAssignment(
        string $complaintId,
        string $assignedTo,
        string $level,
        ?string $barangayId = null,
        ?string $departmentId = null,
        ?string $endedAt = null
    ): void {
        DB::table('complaint_assignments')->insert([
            'id' => sprintf('ffffffff-ffff-4fff-8fff-%012d', $this->assignmentSequence++),
            'complaint_id' => $complaintId,
            'assigned_to' => $assignedTo,
            'assignment_level' => $level,
            'barangay_id' => $barangayId,
            'department_id' => $departmentId,
            'ended_at' => $endedAt,
        ]);
    }

    private function createResolution(
        string $complaintId,
        string $reviewStatus,
        ?string $submittedAt = null,
        ?string $submittedBy = null
    ): void {
        $submittedAt ??= now()->addSeconds($this->resolutionSequence)->toDateTimeString();

        DB::table('complaint_resolutions')->insert([
            'id' => sprintf('99999999-9999-4999-8999-%012d', $this->resolutionSequence++),
            'complaint_id' => $complaintId,
            'submitted_by' => $submittedBy ?? self::PERSONNEL_ID,
            'review_status' => $reviewStatus,
            'submitted_at' => $submittedAt,
            'created_at' => $submittedAt,
        ]);
    }

    private function getAs(string $id, string $uri)
    {
        return $this->withToken($this->syntheticSupabaseToken($id, ['password']))->getJson($uri);
    }
}
