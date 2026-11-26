<?php

namespace Tests\Feature;

use App\Models\Profile;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CitizenDashboardStatisticsTest extends TestCase
{
    private const CITIZEN_ID = '11111111-1111-4111-8111-111111111111';
    private const OTHER_CITIZEN_ID = '22222222-2222-4222-8222-222222222222';
    private int $complaintSequence = 1;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email')->unique();
            $table->string('role');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('complaint_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
        });

        Schema::create('barangays', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
        });

        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id');
            $table->uuid('category_id')->nullable();
            $table->uuid('barangay_id')->nullable();
            $table->string('title');
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('complaint_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->string('file_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size');
        });

        $this->createProfile(self::CITIZEN_ID);
        $this->createProfile(self::OTHER_CITIZEN_ID);

        Http::fake([
            '*' => Http::response([
                'id' => self::CITIZEN_ID,
                'email' => self::CITIZEN_ID . '@example.com',
            ], 200),
        ]);
        $this->withToken($this->syntheticSupabaseToken(self::CITIZEN_ID, ['password']));
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('complaint_attachments');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('barangays');
        Schema::dropIfExists('complaint_categories');
        Schema::dropIfExists('profiles');

        parent::tearDown();
    }

    public function test_citizen_statistics_are_owned_and_group_lifecycle_statuses(): void
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
            $this->createComplaint(self::CITIZEN_ID, $status);
        }

        $this->createComplaint(self::OTHER_CITIZEN_ID, 'submitted');
        $this->createComplaint(self::OTHER_CITIZEN_ID, 'resolved');

        $response = $this->getJson('/api/complaints');

        $response->assertOk()
            ->assertJsonPath('statistics.total', 7)
            ->assertJsonPath('statistics.pre_assignment', 3)
            ->assertJsonPath('statistics.in_progress', 2)
            ->assertJsonPath('statistics.resolved', 1)
            ->assertJsonPath('pagination.total', 7)
            ->assertJsonCount(7, 'data');

        foreach ($response->json('data') as $complaint) {
            $this->assertSame(self::CITIZEN_ID, $complaint['citizen_id']);
        }
    }

    private function createProfile(string $id): void
    {
        Profile::create([
            'id' => $id,
            'full_name' => 'Citizen',
            'email' => $id . '@example.com',
            'role' => 'citizen',
            'is_active' => true,
        ]);
    }

    private function createComplaint(string $citizenId, string $status): void
    {
        DB::table('complaints')->insert([
            'id' => sprintf('aaaaaaaa-aaaa-4aaa-8aaa-%012d', $this->complaintSequence++),
            'citizen_id' => $citizenId,
            'title' => 'Complaint ' . $this->complaintSequence,
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
