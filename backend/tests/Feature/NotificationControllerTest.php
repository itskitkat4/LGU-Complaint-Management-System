<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
{
    private const CITIZEN_ID = '11111111-1111-4111-8111-111111111111';
    private const OTHER_CITIZEN_ID = '22222222-2222-4222-8222-222222222222';
    private const COMPLAINT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.publishable_key' => 'test-publishable-key',
        ]);

        Schema::dropIfExists('notifications');
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
            $table->string('title');
            $table->string('status');
            $table->timestamps();
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
        });

        DB::table('profiles')->insert([
            $this->profile(self::CITIZEN_ID, 'citizen@example.com'),
            $this->profile(self::OTHER_CITIZEN_ID, 'other@example.com'),
        ]);

        DB::table('complaints')->insert([
            'id' => self::COMPLAINT_ID,
            'title' => 'Test complaint',
            'status' => 'resolved',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function profile(string $id, string $email): array
    {
        return [
            'id' => $id,
            'full_name' => 'Test citizen',
            'email' => $email,
            'role' => 'citizen',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function authenticateAs(string $profileId, string $email): void
    {
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response([
                'id' => $profileId,
                'email' => $email,
            ], 200),
        ]);

        $this->withToken($this->syntheticSupabaseToken($profileId, ['password']));
    }

    private function insertNotifications(string $profileId, int $count): void
    {
        $createdAt = '2026-11-22 10:00:00';
        $rows = [];
        $idOffset = $profileId === self::OTHER_CITIZEN_ID ? 100 : 0;

        for ($index = 1; $index <= $count; $index++) {
            $rows[] = [
                'id' => sprintf('90000000-0000-4000-8000-%012d', $idOffset + $index),
                'profile_id' => $profileId,
                'complaint_id' => $index === $count ? self::COMPLAINT_ID : null,
                'title' => "Notification {$index}",
                'message' => "Message {$index}",
                'type' => 'complaint_status_updated',
                'is_read' => false,
                'read_at' => null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];
        }

        if ($rows !== []) {
            DB::table('notifications')->insert($rows);
        }
    }

    public function test_page_size_and_metadata_cover_empty_and_notification_count_boundaries(): void
    {
        $this->authenticateAs(self::CITIZEN_ID, 'citizen@example.com');

        foreach ([0, 10, 11, 20, 25] as $count) {
            DB::table('notifications')->where('profile_id', self::CITIZEN_ID)->delete();
            $this->insertNotifications(self::CITIZEN_ID, $count);

            $response = $this->getJson('/api/notifications?page=1')
                ->assertOk()
                ->assertJsonPath('data.current_page', 1)
                ->assertJsonPath('data.per_page', 10)
                ->assertJsonPath('data.total', $count)
                ->assertJsonPath('data.last_page', max(1, (int) ceil($count / 10)));

            $this->assertLessThanOrEqual(10, count($response->json('data.data')));
            $this->assertSame($count > 10, is_string($response->json('data.next_page_url')));
            $this->assertNull($response->json('data.prev_page_url'));
        }
    }

    public function test_second_page_has_the_next_stable_records_and_navigation_links(): void
    {
        $this->insertNotifications(self::CITIZEN_ID, 25);
        $this->authenticateAs(self::CITIZEN_ID, 'citizen@example.com');

        $response = $this->getJson('/api/notifications?page=2')
            ->assertOk()
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.last_page', 3)
            ->assertJsonPath('data.total', 25)
            ->assertJsonPath('data.data.0.id', '90000000-0000-4000-8000-000000000015')
            ->assertJsonPath('data.data.9.id', '90000000-0000-4000-8000-000000000006')
            ->assertJsonPath('data.data.9.is_read', false);

        $this->assertStringContainsString('page=1', $response->json('data.prev_page_url'));
        $this->assertStringContainsString('page=3', $response->json('data.next_page_url'));
    }

    public function test_out_of_range_page_is_clamped_and_invalid_page_values_are_rejected(): void
    {
        $this->insertNotifications(self::CITIZEN_ID, 11);
        $this->authenticateAs(self::CITIZEN_ID, 'citizen@example.com');

        $this->getJson('/api/notifications?page=100')
            ->assertOk()
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.last_page', 2)
            ->assertJsonCount(1, 'data.data');

        $this->getJson('/api/notifications?page=0')->assertUnprocessable()
            ->assertJsonValidationErrors('page');
        $this->getJson('/api/notifications?page=not-a-number')->assertUnprocessable()
            ->assertJsonValidationErrors('page');

        DB::table('notifications')->delete();
        $this->getJson('/api/notifications?page=100')
            ->assertOk()
            ->assertJsonPath('data.current_page', 1)
            ->assertJsonPath('data.last_page', 1)
            ->assertJsonPath('data.total', 0)
            ->assertJsonCount(0, 'data.data');
    }

    public function test_notification_lists_are_owned_by_the_authenticated_citizen(): void
    {
        $this->insertNotifications(self::CITIZEN_ID, 12);
        $this->insertNotifications(self::OTHER_CITIZEN_ID, 3);

        $this->authenticateAs(self::CITIZEN_ID, 'citizen@example.com');
        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.total', 12)
            ->assertJsonCount(10, 'data.data')
            ->assertJsonMissing(['profile_id' => self::OTHER_CITIZEN_ID]);

        $this->assertSame(3, DB::table('notifications')
            ->where('profile_id', self::OTHER_CITIZEN_ID)
            ->count());
    }

    public function test_another_citizen_receives_only_their_own_collection(): void
    {
        $this->insertNotifications(self::CITIZEN_ID, 12);
        $this->insertNotifications(self::OTHER_CITIZEN_ID, 3);
        $this->authenticateAs(self::OTHER_CITIZEN_ID, 'other@example.com');

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.total', 3)
            ->assertJsonCount(3, 'data.data')
            ->assertJsonMissing(['profile_id' => self::CITIZEN_ID]);
    }

    public function test_notification_endpoint_keeps_its_authentication_requirement(): void
    {
        $this->getJson('/api/notifications')->assertUnauthorized();
    }

    public function test_pagination_does_not_change_read_state_and_mark_as_read_still_works(): void
    {
        $this->insertNotifications(self::CITIZEN_ID, 11);
        $this->authenticateAs(self::CITIZEN_ID, 'citizen@example.com');

        $notificationId = '90000000-0000-4000-8000-000000000011';
        $this->patchJson("/api/notifications/{$notificationId}/read")
            ->assertOk()
            ->assertJsonPath('data.is_read', true);

        $this->getJson('/api/notifications?page=2')
            ->assertOk()
            ->assertJsonPath('data.data.0.is_read', false);

        $this->getJson('/api/notifications?page=1')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $notificationId)
            ->assertJsonPath('data.data.0.is_read', true);

        $this->assertDatabaseHas('notifications', [
            'id' => $notificationId,
            'profile_id' => self::CITIZEN_ID,
            'is_read' => true,
        ]);
    }

    public function test_notification_complaint_relationship_is_preserved_in_page_response(): void
    {
        $this->insertNotifications(self::CITIZEN_ID, 1);
        $this->authenticateAs(self::CITIZEN_ID, 'citizen@example.com');

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.data.0.complaint.id', self::COMPLAINT_ID)
            ->assertJsonPath('data.data.0.complaint.title', 'Test complaint')
            ->assertJsonPath('data.data.0.title', 'Notification 1')
            ->assertJsonPath('data.data.0.message', 'Message 1');
    }
}
