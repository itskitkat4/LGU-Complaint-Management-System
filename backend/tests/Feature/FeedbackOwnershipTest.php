<?php

namespace Tests\Feature;

use App\Models\Profile;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class FeedbackOwnershipTest extends TestCase
{
    private const CITIZEN_ID = '11111111-1111-4111-8111-111111111111';
    private const OTHER_CITIZEN_ID = '22222222-2222-4222-8222-222222222222';
    private const STAFF_ID = '33333333-3333-4333-8333-333333333333';
    private const OWN_COMPLAINT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const OTHER_COMPLAINT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    private const INELIGIBLE_COMPLAINT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('feedback');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('profiles');

        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id');
            $table->uuid('category_id')->nullable();
            $table->string('title')->default('Test complaint');
            $table->boolean('is_anonymous')->default(false);
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id')->unique();
            $table->uuid('citizen_id');
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->timestamps();
        });

        $this->createProfile(self::CITIZEN_ID, 'citizen');
        $this->createProfile(self::OTHER_CITIZEN_ID, 'citizen');
        $this->createProfile(self::STAFF_ID, 'LGU-Staff');

        $this->createComplaint(
            self::OWN_COMPLAINT_ID,
            self::CITIZEN_ID,
            'resolved'
        );
        $this->createComplaint(
            self::OTHER_COMPLAINT_ID,
            self::OTHER_CITIZEN_ID,
            'resolved'
        );
        $this->createComplaint(
            self::INELIGIBLE_COMPLAINT_ID,
            self::CITIZEN_ID,
            'in_progress'
        );
    }

    private function createProfile(string $id, string $role): void
    {
        Profile::create([
            'id' => $id,
            'full_name' => $role,
            'email' => "{$id}@example.com",
            'role' => $role,
            'is_active' => true,
        ]);
    }

    private function createComplaint(string $id, string $citizenId, string $status): void
    {
        DB::table('complaints')->insert([
            'id' => $id,
            'citizen_id' => $citizenId,
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function authenticateAs(string $profileId): void
    {
        Http::fake([
            '*' => Http::response([
                'id' => $profileId,
                'email' => "{$profileId}@example.com",
                'app_metadata' => ['bantayserbisyo_password_setup_completed' => true],
            ], 200),
        ]);

        $this->withToken($this->syntheticSupabaseToken($profileId, ['password']));
    }

    private function feedbackPayload(array $overrides = []): array
    {
        return array_merge([
            'rating' => 5,
            'comment' => 'The issue was resolved successfully.',
        ], $overrides);
    }

    public function test_eligible_complaints_response_includes_anonymity_flag_without_citizen_identity(): void
    {
        DB::table('complaints')
            ->where('id', self::OWN_COMPLAINT_ID)
            ->update(['is_anonymous' => true]);

        $this->authenticateAs(self::CITIZEN_ID);

        $response = $this->getJson('/api/feedback/eligible-complaints')
            ->assertOk();

        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertSame(self::OWN_COMPLAINT_ID, $data[0]['id']);
        $this->assertTrue($data[0]['is_anonymous']);
        $this->assertArrayNotHasKey('citizen_id', $data[0]);
        $this->assertArrayNotHasKey('citizen', $data[0]);
    }
    public function test_citizen_can_submit_feedback_for_their_own_resolved_complaint(): void
    {
        $this->authenticateAs(self::CITIZEN_ID);

        $response = $this->postJson(
            '/api/complaints/' . self::OWN_COMPLAINT_ID . '/feedback',
            $this->feedbackPayload()
        );

        $response->assertCreated()
            ->assertJsonPath('feedback.complaint_id', self::OWN_COMPLAINT_ID)
            ->assertJsonPath('feedback.citizen_id', self::CITIZEN_ID)
            ->assertJsonPath('feedback.rating', 5);

        $this->assertDatabaseHas('feedback', [
            'complaint_id' => self::OWN_COMPLAINT_ID,
            'citizen_id' => self::CITIZEN_ID,
            'rating' => 5,
        ]);
    }

    public function test_citizen_cannot_submit_feedback_for_another_citizens_complaint(): void
    {
        $this->authenticateAs(self::CITIZEN_ID);

        $this->postJson(
            '/api/complaints/' . self::OTHER_COMPLAINT_ID . '/feedback',
            $this->feedbackPayload()
        )->assertNotFound()
            ->assertJsonMissingPath('complaint');

        $this->assertDatabaseCount('feedback', 0);
    }

    public function test_client_cannot_spoof_feedback_citizen_id(): void
    {
        $this->authenticateAs(self::CITIZEN_ID);

        $response = $this->postJson(
            '/api/complaints/' . self::OWN_COMPLAINT_ID . '/feedback',
            $this->feedbackPayload(['citizen_id' => self::OTHER_CITIZEN_ID])
        );

        $response->assertCreated()
            ->assertJsonPath('feedback.citizen_id', self::CITIZEN_ID);
        $this->assertDatabaseHas('feedback', [
            'complaint_id' => self::OWN_COMPLAINT_ID,
            'citizen_id' => self::CITIZEN_ID,
        ]);
        $this->assertDatabaseMissing('feedback', [
            'complaint_id' => self::OWN_COMPLAINT_ID,
            'citizen_id' => self::OTHER_CITIZEN_ID,
        ]);
    }

    public function test_non_citizen_cannot_submit_feedback(): void
    {
        $this->authenticateAs(self::STAFF_ID);

        $this->postJson(
            '/api/complaints/' . self::OWN_COMPLAINT_ID . '/feedback',
            $this->feedbackPayload()
        )->assertForbidden();

        $this->assertDatabaseCount('feedback', 0);
    }

    public function test_feedback_is_rejected_for_a_complaint_that_is_not_resolved(): void
    {
        $this->authenticateAs(self::CITIZEN_ID);

        $this->postJson(
            '/api/complaints/' . self::INELIGIBLE_COMPLAINT_ID . '/feedback',
            $this->feedbackPayload()
        )->assertUnprocessable();

        $this->assertDatabaseCount('feedback', 0);
    }

    public function test_citizen_cannot_submit_feedback_twice_for_one_complaint(): void
    {
        DB::table('feedback')->insert([
            'id' => (string) str()->uuid(),
            'complaint_id' => self::OWN_COMPLAINT_ID,
            'citizen_id' => self::CITIZEN_ID,
            'rating' => 4,
            'comment' => 'Already submitted.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->authenticateAs(self::CITIZEN_ID);

        $this->postJson(
            '/api/complaints/' . self::OWN_COMPLAINT_ID . '/feedback',
            $this->feedbackPayload()
        )->assertUnprocessable();

        $this->assertDatabaseCount('feedback', 1);
    }
}
