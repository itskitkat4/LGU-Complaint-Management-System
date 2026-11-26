<?php

namespace Tests\Feature;

use App\Models\Profile;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StaffReportTest extends TestCase
{
    private string $staffId = '33333333-3333-4333-8333-333333333333';

    private string $citizenId = '11111111-1111-4111-8111-111111111111';

    private string $categoryOne = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    private string $categoryTwo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-11-13 12:00:00');

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

        Schema::create('complaint_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id');
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

        Schema::create('complaint_resolutions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('submitted_by');
            $table->text('resolution_description');
            $table->string('review_status')->default('pending_review');
            $table->uuid('reviewed_by')->nullable();
            $table->text('review_comment')->nullable();
            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_number', 20)->nullable()->unique();
            $table->uuid('generated_by');
            $table->date('date_from');
            $table->date('date_to');
            $table->text('file_path')->nullable();
            $table->timestamps();
        });

        Schema::create('report_summaries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('report_id');
            $table->string('summary_type', 20);
            $table->string('label', 150);
            $table->uuid('category_id')->nullable();
            $table->unsignedInteger('total')->nullable();
            $table->unsignedInteger('received')->nullable();
            $table->unsignedInteger('resolved')->nullable();
            $table->date('month')->nullable();
            $table->timestamps();
        });

        Profile::create([
            'id' => $this->staffId,
            'full_name' => 'Test LGU Staff',
            'email' => 'staff@example.com',
            'role' => 'LGU-Staff',
            'is_active' => true,
        ]);

        Profile::create([
            'id' => $this->citizenId,
            'full_name' => 'Test Citizen',
            'email' => 'citizen@example.com',
            'role' => 'citizen',
            'is_active' => true,
        ]);

        DB::table('complaint_categories')->insert([
            [
                'id' => $this->categoryOne,
                'name' => 'Infrastructure',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $this->categoryTwo,
                'name' => 'Health',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function authenticateAs(string $id, string $email): void
    {
        Http::fake([
            '*' => Http::response([
                'id' => $id,
                'email' => $email,
                'app_metadata' => ['bantayserbisyo_password_setup_completed' => true],
            ], 200),
        ]);
    }

    private function createComplaint(
        string $id,
        string $categoryId,
        string $status,
        string $createdAt
    ): void {
        DB::table('complaints')->insert([
            'id' => $id,
            'citizen_id' => $this->citizenId,
            'category_id' => $categoryId,
            'barangay_id' => 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            'title' => 'Test Complaint',
            'description' => 'Test complaint description',
            'priority' => 'medium',
            'status' => $status,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }

    public function test_staff_report_requires_authentication(): void
    {
        $response = $this->getJson('/api/staff/reports/summary');

        $response->assertUnauthorized();
    }

    public function test_citizen_cannot_access_staff_reports(): void
    {
        $this->authenticateAs($this->citizenId, 'citizen@example.com');

        $response = $this->withToken($this->syntheticSupabaseToken($this->citizenId, ['password']))
            ->getJson('/api/staff/reports/summary');

        $response->assertForbidden();
    }

    public function test_lgu_staff_can_view_complaint_reports(): void
    {
        $this->authenticateAs($this->staffId, 'staff@example.com');

        $this->createComplaint(
            '10000000-0000-4000-8000-000000000001',
            $this->categoryOne,
            'submitted',
            '2026-07-10 10:00:00'
        );

        $this->createComplaint(
            '10000000-0000-4000-8000-000000000002',
            $this->categoryOne,
            'assigned',
            '2026-08-10 10:00:00'
        );

        $this->createComplaint(
            '10000000-0000-4000-8000-000000000003',
            $this->categoryTwo,
            'resolved',
            '2026-09-10 10:00:00'
        );

        $this->createComplaint(
            '10000000-0000-4000-8000-000000000004',
            $this->categoryTwo,
            'under_review',
            '2026-10-10 10:00:00'
        );

        // One approved resolution in October.
        DB::table('complaint_resolutions')->insert([
            'id' => '20000000-0000-4000-8000-000000000001',
            'complaint_id' => '10000000-0000-4000-8000-000000000003',
            'submitted_by' => $this->citizenId,
            'resolution_description' => 'Issue resolved.',
            'review_status' => 'approved',
            'reviewed_by' => $this->staffId,
            'submitted_at' => '2026-10-10 10:00:00',
            'reviewed_at' => '2026-10-15 10:00:00',
            'created_at' => '2026-10-10 10:00:00',
            'updated_at' => '2026-10-15 10:00:00',
        ]);

        // A returned resolution must not count as resolved.
        DB::table('complaint_resolutions')->insert([
            'id' => '20000000-0000-4000-8000-000000000002',
            'complaint_id' => '10000000-0000-4000-8000-000000000004',
            'submitted_by' => $this->citizenId,
            'resolution_description' => 'Needs further work.',
            'review_status' => 'returned',
            'reviewed_by' => $this->staffId,
            'submitted_at' => '2026-10-20 10:00:00',
            'reviewed_at' => '2026-10-21 10:00:00',
            'created_at' => '2026-10-20 10:00:00',
            'updated_at' => '2026-10-21 10:00:00',
        ]);

        $response = $this->withToken($this->syntheticSupabaseToken($this->staffId, ['password']))
            ->getJson('/api/staff/reports/summary');

        $response->assertOk()
            ->assertJsonPath('summary.total', 4)
            ->assertJsonPath('summary.pending', 2)
            ->assertJsonPath('summary.in_progress', 1)
            ->assertJsonPath('summary.resolved', 1)
            ->assertJsonCount(4, 'by_status')
            ->assertJsonCount(2, 'by_category')
            ->assertJsonCount(6, 'monthly');

        $response->assertJsonFragment([
            'category' => 'Infrastructure',
            'total' => 2,
        ]);

        $response->assertJsonFragment([
            'category' => 'Health',
            'total' => 2,
        ]);

        $response->assertJsonFragment([
            'month' => '2026-10',
            'received' => 1,
            'resolved' => 1,
        ]);

        $response->assertJsonFragment([
            'month' => '2026-07',
            'received' => 1,
            'resolved' => 0,
        ]);
    }

    public function test_lgu_staff_can_generate_a_consolidated_report(): void
    {
        // Authenticate as LGU Staff.
        $this->authenticateAs($this->staffId, 'staff@example.com');

        // Create three complaints within the selected date range.
        $this->createComplaint(
            '30000000-0000-4000-8000-000000000001',
            $this->categoryOne,
            'submitted',
            '2026-07-10 10:00:00'
        );

        $this->createComplaint(
            '30000000-0000-4000-8000-000000000002',
            $this->categoryOne,
            'assigned',
            '2026-08-10 10:00:00'
        );

        $this->createComplaint(
            '30000000-0000-4000-8000-000000000003',
            $this->categoryTwo,
            'resolved',
            '2026-09-10 10:00:00'
        );

        // Generate the report.
        $response = $this->withToken($this->syntheticSupabaseToken($this->staffId, ['password']))
            ->postJson('/api/staff/reports', [
                'date_from' => '2026-07-01',
                'date_to' => '2026-10-31'
            ]);

        // Check the response.
        $response->assertCreated()
            ->assertJsonPath('message', 'Report generated successfully.')
            ->assertJsonPath('report.report_number', 'R000001')
            ->assertJsonPath('report.total_complaints', 3)
            ->assertJsonPath('report.pending', 1)
            ->assertJsonPath('report.in_progress', 1)
            ->assertJsonPath('report.resolved', 1);

        // Check that the report was saved.s
        $this->assertDatabaseCount('reports', 1);

        // Four status summaries and two category summaries.
        $this->assertDatabaseCount('report_summaries', 10);
    }

}
