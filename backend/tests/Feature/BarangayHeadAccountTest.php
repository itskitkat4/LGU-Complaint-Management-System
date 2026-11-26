<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Services\SupabaseAdminService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BarangayHeadAccountTest extends TestCase
{
    private const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const BARANGAY_ONE = '11111111-1111-4111-8111-111111111111';
    private const BARANGAY_TWO = '22222222-2222-4222-8222-222222222222';

    private function prepareDatabase(string $authRole = 'System Administrator'): void
    {
        Schema::create('barangays', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('code')->nullable();
            $table->timestamps();
        });

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

        DB::statement("
            CREATE UNIQUE INDEX profiles_one_active_barangay_head_per_barangay_unique
            ON profiles (barangay_id)
            WHERE role = 'Barangay_Head'
            AND is_active = 1
            AND barangay_id IS NOT NULL
        ");

        DB::table('barangays')->insert([
            [
                'id' => self::BARANGAY_ONE,
                'name' => 'North Barangay',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => self::BARANGAY_TWO,
                'name' => 'South Barangay',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        Profile::create([
            'id' => self::ADMIN_ID,
            'full_name' => 'Test Administrator',
            'email' => 'admin@example.com',
            'role' => $authRole,
            'is_active' => true,
        ]);

        Http::fake([
            '*' => Http::response([
                'id' => self::ADMIN_ID,
                'email' => 'admin@example.com',
            ], 200),
        ]);
    }

    private function createHeadPayload(string $email, string $barangayId): array
    {
        return [
            'full_name' => 'Test Barangay Head',
            'email' => $email,
            'role' => 'Barangay_Head',
            'barangay_id' => $barangayId,
        ];
    }

    public function test_first_active_barangay_head_creation_succeeds(): void
    {
        $this->prepareDatabase();
        $headId = '33333333-3333-4333-8333-333333333333';
        $this->mock(SupabaseAdminService::class, function ($mock) use ($headId) {
            $mock->shouldReceive('inviteUser')
                ->once()
                ->andReturn(['id' => $headId]);
            $mock->shouldReceive('markPasswordSetupPending')->once()->with($headId);
        });

        $response = $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', $this->createHeadPayload(
                'head-one@example.com',
                self::BARANGAY_ONE
            ));

        $response->assertCreated()
            ->assertJsonPath('profile.role', 'Barangay_Head')
            ->assertJsonPath('profile.barangay_id', self::BARANGAY_ONE);

        $this->assertDatabaseHas('profiles', [
            'id' => $headId,
            'barangay_id' => self::BARANGAY_ONE,
            'role' => 'Barangay_Head',
            'is_active' => true,
        ]);
    }

    public function test_supabase_email_rate_limit_returns_actionable_retry_response(): void
    {
        $this->prepareDatabase();
        $this->mock(SupabaseAdminService::class, function ($mock) {
            $mock->shouldReceive('inviteUser')
                ->once()
                ->andThrow(new \RuntimeException(
                    'Supabase invitation email rate limit exceeded.',
                    429
                ));
            $mock->shouldNotReceive('markPasswordSetupPending');
        });

        $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', $this->createHeadPayload(
                'head-one@example.com',
                self::BARANGAY_ONE
            ))
            ->assertStatus(429)
            ->assertJsonPath(
                'message',
                'Supabase temporarily rate-limited invitation email delivery. Configure custom SMTP in Supabase or wait before retrying.'
            );

        $this->assertDatabaseMissing('profiles', [
            'email' => 'head-one@example.com',
        ]);
    }

    public function test_duplicate_active_barangay_head_returns_conflict(): void
    {
        $this->prepareDatabase();
        Profile::create([
            'id' => '33333333-3333-4333-8333-333333333333',
            'full_name' => 'Existing Barangay Head',
            'email' => 'existing-head@example.com',
            'role' => 'Barangay_Head',
            'barangay_id' => self::BARANGAY_ONE,
            'is_active' => true,
        ]);

        $response = $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', $this->createHeadPayload(
                'another-head@example.com',
                self::BARANGAY_ONE
            ));

        $response->assertStatus(409)
            ->assertExactJson([
                'message' => 'This barangay already has an active Barangay Head.',
            ]);
        $this->assertDatabaseMissing('profiles', [
            'email' => 'another-head@example.com',
        ]);
    }

    public function test_active_barangay_heads_can_be_created_for_different_barangays(): void
    {
        $this->prepareDatabase();
        $headOneId = '33333333-3333-4333-8333-333333333333';
        $headTwoId = '44444444-4444-4444-8444-444444444444';
        $this->mock(SupabaseAdminService::class, function ($mock) use (
            $headOneId,
            $headTwoId
        ) {
            $mock->shouldReceive('inviteUser')
                ->twice()
                ->andReturn(
                    ['id' => $headOneId],
                    ['id' => $headTwoId]
                );
            $mock->shouldReceive('markPasswordSetupPending')
                ->twice()
                ->withArgs(fn (string $id): bool => in_array($id, [$headOneId, $headTwoId], true));
        });

        $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', $this->createHeadPayload(
                'head-one@example.com',
                self::BARANGAY_ONE
            ))
            ->assertCreated();

        $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', $this->createHeadPayload(
                'head-two@example.com',
                self::BARANGAY_TWO
            ))
            ->assertCreated();

        $this->assertDatabaseHas('profiles', [
            'id' => $headTwoId,
            'barangay_id' => self::BARANGAY_TWO,
            'is_active' => true,
        ]);
    }

    public function test_inactive_barangay_head_does_not_block_a_new_active_head(): void
    {
        $this->prepareDatabase();
        Profile::create([
            'id' => '33333333-3333-4333-8333-333333333333',
            'full_name' => 'Inactive Barangay Head',
            'email' => 'inactive-head@example.com',
            'role' => 'Barangay_Head',
            'barangay_id' => self::BARANGAY_ONE,
            'is_active' => false,
        ]);

        $headId = '44444444-4444-4444-8444-444444444444';
        $this->mock(SupabaseAdminService::class, function ($mock) use ($headId) {
            $mock->shouldReceive('inviteUser')
                ->once()
                ->andReturn(['id' => $headId]);
            $mock->shouldReceive('markPasswordSetupPending')->once()->with($headId);
        });

        $response = $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', $this->createHeadPayload(
                'replacement-head@example.com',
                self::BARANGAY_ONE
            ));

        $response->assertCreated();
        $this->assertDatabaseHas('profiles', [
            'id' => $headId,
            'barangay_id' => self::BARANGAY_ONE,
            'is_active' => true,
        ]);
    }

    public function test_barangay_head_creation_handles_unique_index_race_without_leaking_database_error(): void
    {
        $this->prepareDatabase();
        $headId = '44444444-4444-4444-8444-444444444444';
        $this->mock(SupabaseAdminService::class, function ($mock) use ($headId) {
            $mock->shouldReceive('inviteUser')
                ->once()
                ->andReturnUsing(function () use ($headId) {
                    Profile::create([
                        'id' => '33333333-3333-4333-8333-333333333333',
                        'full_name' => 'Concurrent Barangay Head',
                        'email' => 'concurrent-head@example.com',
                        'role' => 'Barangay_Head',
                        'barangay_id' => self::BARANGAY_ONE,
                        'is_active' => true,
                    ]);

                    return ['id' => $headId];
                });
            $mock->shouldReceive('markPasswordSetupPending')->once()->with($headId);
            $mock->shouldReceive('deleteUser')->once()->with($headId);
        });

        $response = $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', $this->createHeadPayload(
                'racing-head@example.com',
                self::BARANGAY_ONE
            ));

        $response->assertStatus(409)
            ->assertExactJson([
                'message' => 'This barangay already has an active Barangay Head.',
            ]);
        $this->assertDatabaseMissing('profiles', [
            'email' => 'racing-head@example.com',
        ]);
    }

    public function test_non_administrator_cannot_create_barangay_heads(): void
    {
        $this->prepareDatabase('Barangay_Head');

        $response = $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', $this->createHeadPayload(
                'unauthorized-head@example.com',
                self::BARANGAY_ONE
            ));

        $response->assertForbidden();
        $this->assertDatabaseMissing('profiles', [
            'email' => 'unauthorized-head@example.com',
        ]);
    }
}
