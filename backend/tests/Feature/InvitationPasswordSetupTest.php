<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Services\SupabaseAdminService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class InvitationPasswordSetupTest extends TestCase
{
    private const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
    private const STAFF_ID = '22222222-2222-4222-8222-222222222222';
    private const ADMIN_EMAIL = 'admin@example.com';
    private const STAFF_EMAIL = 'personnel@example.com';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.publishable_key' => 'test-publishable-key',
            'services.supabase.secret_key' => 'test-service-role-key',
            'services.supabase.frontend_url' => 'https://bantay.example.com',
        ]);

        Schema::dropIfExists('profiles');
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
    }

    private function createProfile(string $id, string $email, string $role): void
    {
        Profile::create([
            'id' => $id,
            'full_name' => 'Test ' . $role,
            'email' => $email,
            'role' => $role,
            'is_active' => true,
        ]);
    }

    private function authUserResponse(string $id, string $email, bool $setupComplete = true): array
    {
        return [
            'id' => $id,
            'email' => $email,
            'app_metadata' => [
                SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => $setupComplete,
            ],
        ];
    }

    public function test_password_setup_and_completion_marker_are_updated_together_after_validation(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');

        Http::fake(function (ClientRequest $request) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response($this->authUserResponse(self::STAFF_ID, self::STAFF_EMAIL, false), 200);
            }

            if ($request->method() === 'GET'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . self::STAFF_ID)) {
                return Http::response(['user' => [
                    'id' => self::STAFF_ID,
                    'email' => self::STAFF_EMAIL,
                    'app_metadata' => [
                        'provider' => 'email',
                        SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => false,
                    ],
                ]], 200);
            }

            if ($request->method() === 'PUT'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . self::STAFF_ID)) {
                return Http::response(['id' => self::STAFF_ID], 200);
            }

            return Http::response([], 404);
        });

        $response = $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))->postJson(
            '/api/staff-accounts/complete-password-setup',
            ['password' => 'StrongPassword1!']
        );

        $response->assertOk()->assertJsonPath('message', 'Password setup completed successfully.');
        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'PUT'
            && str_ends_with($request->url(), '/auth/v1/admin/users/' . self::STAFF_ID)
            && $request->data() === [
                'password' => 'StrongPassword1!',
                'app_metadata' => [
                    'provider' => 'email',
                    SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
                ],
            ]
            && $request->hasHeader('apikey', 'test-service-role-key')
            && ! $request->hasHeader('Authorization'));
    }

    public function test_password_setup_rejects_passwords_that_fail_a_displayed_requirement(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response(
                $this->authUserResponse(self::STAFF_ID, self::STAFF_EMAIL, false),
                200
            ),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->postJson('/api/staff-accounts/complete-password-setup', [
                'password' => 'lowercase1!',
            ])
            ->assertUnprocessable();

        Http::assertNotSent(fn (ClientRequest $request): bool => $request->method() === 'PUT');
    }

    public function test_failed_supabase_password_update_does_not_complete_setup(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        Http::fake(function (ClientRequest $request) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response($this->authUserResponse(self::STAFF_ID, self::STAFF_EMAIL, false), 200);
            }

            if ($request->method() === 'GET'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . self::STAFF_ID)) {
                return Http::response(['user' => [
                    'id' => self::STAFF_ID,
                    'email' => self::STAFF_EMAIL,
                    'app_metadata' => [SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => false],
                ]], 200);
            }

            if ($request->method() === 'PUT'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . self::STAFF_ID)) {
                return Http::response(['msg' => 'Rejected'], 422);
            }

            return Http::response([], 404);
        });

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->postJson('/api/staff-accounts/complete-password-setup', [
                'password' => 'StrongPassword1!',
            ])
            ->assertStatus(502)
            ->assertJsonPath('message', 'Unable to set the password. Please try again.');

        Http::assertSentCount(3);
        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'PUT'
            && ($request->data()['app_metadata'][SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY] ?? null) === true
            && isset($request->data()['password']));
    }

    public function test_new_staff_account_sends_initial_invitation_and_marks_setup_pending(): void
    {
        $this->createProfile(self::ADMIN_ID, self::ADMIN_EMAIL, 'System Administrator');
        $newStaffId = '33333333-3333-4333-8333-333333333333';
        $newStaffEmail = 'new.personnel@example.com';

        Http::fake(function (ClientRequest $request) use ($newStaffId, $newStaffEmail) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response($this->authUserResponse(self::ADMIN_ID, self::ADMIN_EMAIL), 200);
            }

            if ($request->method() === 'POST' && str_contains($request->url(), '/auth/v1/invite?')) {
                return Http::response([
                    'id' => $newStaffId,
                    'email' => $newStaffEmail,
                ], 200);
            }

            if ($request->method() === 'GET'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)) {
                return Http::response(['user' => [
                    'id' => $newStaffId,
                    'email' => $newStaffEmail,
                    'app_metadata' => ['provider' => 'email'],
                ]], 200);
            }

            if ($request->method() === 'PUT'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)) {
                return Http::response([], 200);
            }

            return Http::response([], 404);
        });

        $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', [
                'full_name' => 'New Personnel',
                'email' => $newStaffEmail,
                'role' => 'LGU-Staff',
            ])
            ->assertCreated()
            ->assertJsonPath('profile.id', $newStaffId);

        $this->assertDatabaseHas('profiles', [
            'id' => $newStaffId,
            'email' => $newStaffEmail,
        ]);
        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'POST'
            && str_starts_with($request->url(), 'https://example.supabase.co/auth/v1/invite?')
            && str_contains($request->url(), urlencode('https://bantay.example.com/set-password'))
            && $request->data() === [
                'email' => $newStaffEmail,
                'data' => ['full_name' => 'New Personnel'],
            ]);
        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'PUT'
            && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)
            && $request->data()['app_metadata'][SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY] === false);
        Http::assertSentCount(4);
    }

    public function test_staff_account_creation_normalizes_email_for_invitation_and_profile(): void
    {
        $this->createProfile(self::ADMIN_ID, self::ADMIN_EMAIL, 'System Administrator');
        $newStaffId = '33333333-3333-4333-8333-333333333333';
        $normalizedEmail = 'juan@example.com';

        Http::fake(function (ClientRequest $request) use ($newStaffId, $normalizedEmail) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response($this->authUserResponse(self::ADMIN_ID, self::ADMIN_EMAIL), 200);
            }

            if ($request->method() === 'POST' && str_contains($request->url(), '/auth/v1/invite?')) {
                return Http::response([
                    'id' => $newStaffId,
                    'email' => $normalizedEmail,
                ], 200);
            }

            if ($request->method() === 'GET'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)) {
                return Http::response(['user' => [
                    'id' => $newStaffId,
                    'email' => $normalizedEmail,
                    'app_metadata' => ['provider' => 'email'],
                ]], 200);
            }

            if ($request->method() === 'PUT'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)) {
                return Http::response([], 200);
            }

            return Http::response([], 404);
        });

        $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', [
                'full_name' => 'Juan Example',
                'email' => '  Juan@Example.com  ',
                'role' => 'LGU-Staff',
            ])
            ->assertCreated()
            ->assertJsonPath('profile.email', $normalizedEmail);

        $this->assertDatabaseHas('profiles', [
            'id' => $newStaffId,
            'email' => $normalizedEmail,
        ]);
        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'POST'
            && str_contains($request->url(), '/auth/v1/invite?')
            && $request->data()['email'] === $normalizedEmail);
    }

    public function test_staff_account_duplicate_check_uses_normalized_email(): void
    {
        $this->createProfile(self::ADMIN_ID, self::ADMIN_EMAIL, 'System Administrator');
        $this->createProfile(self::STAFF_ID, 'juan@example.com', 'LGU-Staff');

        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response(
                $this->authUserResponse(self::ADMIN_ID, self::ADMIN_EMAIL),
                200
            ),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', [
                'full_name' => 'Juan Duplicate',
                'email' => 'Juan@Example.com',
                'role' => 'LGU-Staff',
            ])
            ->assertStatus(409)
            ->assertJsonPath('message', 'An account with this email already exists.');

        Http::assertNotSent(fn (ClientRequest $request): bool => str_contains(
            $request->url(),
            '/auth/v1/invite'
        ));
        $this->assertDatabaseCount('profiles', 2);
    }

    public function test_failed_profile_creation_deletes_invited_auth_user_with_authenticated_cleanup(): void
    {
        $this->createProfile(self::ADMIN_ID, self::ADMIN_EMAIL, 'System Administrator');
        $newStaffId = '33333333-3333-4333-8333-333333333333';
        $newStaffEmail = 'failed.profile@example.com';

        \Illuminate\Support\Facades\DB::unprepared("
            CREATE TRIGGER fail_staff_profile_insert
            BEFORE INSERT ON profiles
            WHEN NEW.email = '{$newStaffEmail}'
            BEGIN
                SELECT RAISE(FAIL, 'profile insert failed');
            END
        ");

        Http::fake(function (ClientRequest $request) use ($newStaffId, $newStaffEmail) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response($this->authUserResponse(self::ADMIN_ID, self::ADMIN_EMAIL), 200);
            }

            if ($request->method() === 'POST' && str_contains($request->url(), '/auth/v1/invite?')) {
                return Http::response([
                    'id' => $newStaffId,
                    'email' => $newStaffEmail,
                ], 200);
            }

            if ($request->method() === 'GET'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)) {
                return Http::response(['user' => [
                    'id' => $newStaffId,
                    'email' => $newStaffEmail,
                    'app_metadata' => ['provider' => 'email'],
                ]], 200);
            }

            if ($request->method() === 'PUT'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)) {
                return Http::response([], 200);
            }

            if ($request->method() === 'DELETE'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)) {
                return Http::response([], 200);
            }

            return Http::response([], 404);
        });

        $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', [
                'full_name' => 'New Personnel',
                'email' => $newStaffEmail,
                'role' => 'LGU-Staff',
            ])
            ->assertStatus(500)
            ->assertJsonPath('message', 'Unable to create staff account.');

        $this->assertDatabaseMissing('profiles', ['email' => $newStaffEmail]);
        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'DELETE'
            && $request->url() === 'https://example.supabase.co/auth/v1/admin/users/' . $newStaffId
            && $request->hasHeader('apikey', 'test-service-role-key')
            && $request->hasHeader('Authorization', 'Bearer test-service-role-key'));
        Http::assertSentCount(5);
    }

    public function test_cleanup_failure_keeps_profile_error_safe_and_only_deletes_new_auth_user(): void
    {
        $this->createProfile(self::ADMIN_ID, self::ADMIN_EMAIL, 'System Administrator');
        $newStaffId = '55555555-5555-4555-8555-555555555555';
        $newStaffEmail = 'cleanup.failure@example.com';

        \Illuminate\Support\Facades\DB::unprepared(<<<SQL
            CREATE TRIGGER fail_cleanup_failure_profile_insert
            BEFORE INSERT ON profiles
            WHEN NEW.email = '{$newStaffEmail}'
            BEGIN
                SELECT RAISE(FAIL, 'profile insert failed');
            END
        SQL);

        Http::fake(function (ClientRequest $request) use ($newStaffId, $newStaffEmail) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response($this->authUserResponse(self::ADMIN_ID, self::ADMIN_EMAIL), 200);
            }

            if ($request->method() === 'POST' && str_contains($request->url(), '/auth/v1/invite?')) {
                return Http::response(['id' => $newStaffId, 'email' => $newStaffEmail], 200);
            }

            if ($request->method() === 'GET'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)) {
                return Http::response(['user' => [
                    'id' => $newStaffId,
                    'email' => $newStaffEmail,
                    'app_metadata' => ['provider' => 'email'],
                ]], 200);
            }

            if ($request->method() === 'PUT'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)) {
                return Http::response([], 200);
            }

            if ($request->method() === 'DELETE'
                && str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId)) {
                return Http::response(['message' => 'private provider cleanup detail'], 500);
            }

            return Http::response([], 404);
        });
        Log::spy();

        $response = $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->postJson('/api/staff-accounts', [
                'full_name' => 'Cleanup Failure Personnel',
                'email' => $newStaffEmail,
                'role' => 'LGU-Staff',
            ]);

        $response->assertStatus(500)
            ->assertJsonPath('message', 'Unable to create staff account.');
        $this->assertStringNotContainsString('private provider cleanup detail', $response->getContent());
        $this->assertDatabaseMissing('profiles', ['email' => $newStaffEmail]);
        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'DELETE'
            && $request->url() === 'https://example.supabase.co/auth/v1/admin/users/' . $newStaffId
            && $request->hasHeader('apikey', 'test-service-role-key')
            && $request->hasHeader('Authorization', 'Bearer test-service-role-key'));
        Http::assertNotSent(fn (ClientRequest $request): bool => $request->method() === 'DELETE'
            && str_contains($request->url(), '/auth/v1/admin/users/')
            && !str_ends_with($request->url(), '/auth/v1/admin/users/' . $newStaffId));
        Log::shouldHaveReceived('error')->atLeast()->once();
    }

    public function test_pending_personnel_can_only_access_the_password_setup_endpoint(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response(
                $this->authUserResponse(self::STAFF_ID, self::STAFF_EMAIL, false),
                200
            ),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->getJson('/api/auth/me')
            ->assertForbidden();

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->postJson('/api/staff-accounts/complete-password-setup', [])
            ->assertUnprocessable();

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['otp']))
            ->postJson('/api/staff-accounts/complete-password-setup', [])
            ->assertUnprocessable();
    }

    public function test_pending_personnel_google_session_cannot_access_apis_or_complete_password_setup(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response([
                'id' => self::STAFF_ID,
                'email' => self::STAFF_EMAIL,
                'app_metadata' => [
                    SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => false,
                    'provider' => 'email',
                    'providers' => ['email', 'google'],
                ],
                'identities' => [
                    ['provider' => 'email'],
                    ['provider' => 'google'],
                ],
            ], 200),
        ]);
        $googleSession = $this->syntheticSupabaseToken(self::STAFF_ID, ['oauth']);

        $this->withToken($googleSession)
            ->getJson('/api/auth/me')
            ->assertForbidden();

        $this->withToken($googleSession)
            ->postJson('/api/staff-accounts/complete-password-setup', [
                'password' => 'StrongPassword1!',
            ])
            ->assertForbidden();

        Http::assertSentCount(1);
    }

    public function test_missing_or_invalid_setup_state_is_rejected_for_personnel(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response([
                'id' => self::STAFF_ID,
                'email' => self::STAFF_EMAIL,
                'app_metadata' => [
                    SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => 'false',
                ],
            ], 200),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->getJson('/api/auth/me')
            ->assertForbidden();

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->postJson('/api/staff-accounts/complete-password-setup', [
                'password' => 'StrongPassword1!',
            ])
            ->assertForbidden();

        Http::assertSentCount(1);
    }

    public function test_personnel_without_setup_marker_cannot_access_protected_apis(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response(
                ['id' => self::STAFF_ID, 'email' => self::STAFF_EMAIL],
                200
            ),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->getJson('/api/auth/me')
            ->assertForbidden();
    }

    public function test_completed_personnel_can_access_authorized_apis_but_not_admin_apis(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('description')->nullable();
        });
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response(
                $this->authUserResponse(self::STAFF_ID, self::STAFF_EMAIL),
                200
            ),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->getJson('/api/departments')
            ->assertOk();

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->postJson('/api/staff-accounts', [])
            ->assertForbidden();
    }

    public function test_inactive_personnel_remain_blocked_even_when_setup_is_complete(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        Profile::whereKey(self::STAFF_ID)->update(['is_active' => false]);
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response(
                $this->authUserResponse(self::STAFF_ID, self::STAFF_EMAIL),
                200
            ),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->getJson('/api/departments')
            ->assertForbidden();
    }

    public function test_completed_account_cannot_reuse_initial_password_setup_endpoint(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response(
                $this->authUserResponse(self::STAFF_ID, self::STAFF_EMAIL),
                200
            ),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->postJson('/api/staff-accounts/complete-password-setup', [
                'password' => 'ChangedPassword1!',
            ])
            ->assertForbidden();

        Http::assertSentCount(1);
    }

    public function test_email_mismatch_is_rejected_before_password_setup(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response(
                $this->authUserResponse(self::STAFF_ID, 'another@example.com', false),
                200
            ),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->postJson('/api/staff-accounts/complete-password-setup', [
                'password' => 'StrongPassword1!',
            ])
            ->assertStatus(409);

        Http::assertSentCount(1);
    }

    public function test_setup_uses_only_the_authenticated_user_even_if_another_user_id_is_submitted(): void
    {
        $otherStaffId = '44444444-4444-4444-8444-444444444444';
        $otherStaffEmail = 'other.personnel@example.com';
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        $this->createProfile($otherStaffId, $otherStaffEmail, 'Department_Personnel');

        Http::fake(function (ClientRequest $request) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response(
                    $this->authUserResponse(self::STAFF_ID, self::STAFF_EMAIL, false),
                    200
                );
            }

            if ($request->method() === 'GET') {
                return Http::response(['user' => [
                    'id' => self::STAFF_ID,
                    'email' => self::STAFF_EMAIL,
                    'app_metadata' => [
                        SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => false,
                    ],
                ]], 200);
            }

            return Http::response(['id' => self::STAFF_ID], 200);
        });

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->postJson('/api/staff-accounts/complete-password-setup', [
                'user_id' => $otherStaffId,
                'email' => $otherStaffEmail,
                'password' => 'StrongPassword1!',
            ])
            ->assertOk();

        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'PUT'
            && str_ends_with($request->url(), '/auth/v1/admin/users/' . self::STAFF_ID));
        Http::assertNotSent(fn (ClientRequest $request): bool => str_ends_with(
            $request->url(),
            '/auth/v1/admin/users/' . $otherStaffId
        ));
    }

    public function test_citizen_profile_provisioning_remains_available_to_authenticated_google_users(): void
    {
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response([
                'id' => self::STAFF_ID,
                'email' => 'citizen@example.com',
                'app_metadata' => ['provider' => 'google', 'providers' => ['google']],
                'user_metadata' => ['name' => 'Google Citizen'],
            ], 200),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['oauth']))
            ->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('profile.role', 'citizen')
            ->assertJsonPath('profile.email', 'citizen@example.com');
    }

    public function test_service_rejects_a_completed_account_even_if_called_directly(): void
    {
        Http::fake([
            'https://example.supabase.co/auth/v1/admin/users/' . self::STAFF_ID => Http::response([
                'user' => [
                    'id' => self::STAFF_ID,
                    'email' => self::STAFF_EMAIL,
                    'app_metadata' => [
                        SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
                    ],
                ],
            ], 200),
        ]);

        try {
            app(SupabaseAdminService::class)->setPasswordAndMarkSetupComplete(
                self::STAFF_ID,
                self::STAFF_EMAIL,
                'ChangedPassword1!'
            );
            $this->fail('A completed account must not use initial setup.');
        } catch (\InvalidArgumentException $exception) {
            $this->assertSame('Password setup is not pending for this account.', $exception->getMessage());
        }

        Http::assertNotSent(fn (ClientRequest $request): bool => $request->method() === 'PUT');
    }

    public function test_service_rejects_an_auth_email_mismatch_before_updating_password(): void
    {
        Http::fake([
            'https://example.supabase.co/auth/v1/admin/users/' . self::STAFF_ID => Http::response([
                'user' => [
                    'id' => self::STAFF_ID,
                    'email' => 'different@example.com',
                    'app_metadata' => [
                        SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => false,
                    ],
                ],
            ], 200),
        ]);

        try {
            app(SupabaseAdminService::class)->setPasswordAndMarkSetupComplete(
                self::STAFF_ID,
                self::STAFF_EMAIL,
                'StrongPassword1!'
            );
            $this->fail('The Auth email must match the personnel profile.');
        } catch (\InvalidArgumentException $exception) {
            $this->assertSame('Staff identity does not match the Auth account.', $exception->getMessage());
        }

        Http::assertNotSent(fn (ClientRequest $request): bool => $request->method() === 'PUT');
    }

    public function test_legacy_account_without_marker_is_reported_as_unverified(): void
    {
        $this->createProfile(self::ADMIN_ID, self::ADMIN_EMAIL, 'System Administrator');
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');

        Http::fake(function (ClientRequest $request) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response($this->authUserResponse(self::ADMIN_ID, self::ADMIN_EMAIL), 200);
            }

            if ($request->method() === 'GET'
                && str_starts_with($request->url(), 'https://example.supabase.co/auth/v1/admin/users?')) {
                return Http::response(['users' => [[
                    'id' => self::STAFF_ID,
                    'email' => self::STAFF_EMAIL,
                    'email_confirmed_at' => '2026-11-19T10:00:00Z',
                    'app_metadata' => ['provider' => 'email'],
                ]]], 200);
            }

            if (str_ends_with($request->url(), '/auth/v1/admin/users/' . self::STAFF_ID)) {
                return Http::response(['user' => [
                    'id' => self::STAFF_ID,
                    'email' => self::STAFF_EMAIL,
                    'email_confirmed_at' => '2026-11-19T10:00:00Z',
                    'app_metadata' => ['provider' => 'email'],
                ]], 200);
            }

            return Http::response([], 404);
        });

        $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->getJson('/api/staff-accounts')
            ->assertOk()
            ->assertJsonPath('staff.0.invitation_setup_completed', null)
            ->assertJsonPath('staff.0.invitation_pending', false);

        Http::assertNotSent(fn (ClientRequest $request): bool => str_contains($request->url(), '/auth/v1/recover'));
    }

    public function test_staff_listing_uses_one_bulk_auth_lookup_for_many_profiles(): void
    {
        $this->createProfile(self::ADMIN_ID, self::ADMIN_EMAIL, 'System Administrator');
        $staffUsers = [];

        for ($index = 1; $index <= 40; $index++) {
            $id = sprintf('33333333-3333-4333-8333-%012d', $index);
            $email = sprintf('staff%02d@example.com', $index);
            $this->createProfile($id, $email, 'LGU-Staff');
            $staffUsers[] = [
                'id' => $id,
                'email' => $email,
                'app_metadata' => [
                    SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => $index % 2 === 0,
                ],
            ];
        }

        Http::fake(function (ClientRequest $request) use ($staffUsers) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response($this->authUserResponse(self::ADMIN_ID, self::ADMIN_EMAIL), 200);
            }

            if ($request->method() === 'GET'
                && str_starts_with($request->url(), 'https://example.supabase.co/auth/v1/admin/users?')) {
                return Http::response(['users' => $staffUsers], 200);
            }

            return Http::response([], 404);
        });

        $response = $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->getJson('/api/staff-accounts');

        $response->assertOk()
            ->assertJsonCount(40, 'staff')
            ->assertJsonStructure([
                'message',
                'staff' => [[
                    'id',
                    'full_name',
                    'email',
                    'role',
                    'barangay_id',
                    'department_id',
                    'is_active',
                    'created_at',
                    'invitation_setup_completed',
                    'invitation_pending',
                ]],
            ])
            ->assertJsonPath('staff.0.email', 'staff01@example.com')
            ->assertJsonPath('staff.0.invitation_setup_completed', false)
            ->assertJsonPath('staff.0.invitation_pending', true)
            ->assertJsonPath('staff.1.email', 'staff02@example.com')
            ->assertJsonPath('staff.1.invitation_setup_completed', true)
            ->assertJsonPath('staff.1.invitation_pending', false);

        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'GET'
            && str_starts_with($request->url(), 'https://example.supabase.co/auth/v1/admin/users?')
            && str_contains($request->url(), 'page=1')
            && str_contains($request->url(), 'per_page=1000')
            && $request->hasHeader('apikey', 'test-service-role-key')
            && $request->hasHeader('Authorization', 'Bearer test-service-role-key'));
        Http::assertNotSent(fn (ClientRequest $request): bool => preg_match(
            '#/auth/v1/admin/users/[^?]+$#',
            $request->url()
        ) === 1);
        Http::assertSentCount(2);
    }

    public function test_staff_listing_returns_an_error_when_bulk_auth_lookup_fails(): void
    {
        $this->createProfile(self::ADMIN_ID, self::ADMIN_EMAIL, 'System Administrator');
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');

        Http::fake(function (ClientRequest $request) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response($this->authUserResponse(self::ADMIN_ID, self::ADMIN_EMAIL), 200);
            }

            if (str_starts_with($request->url(), 'https://example.supabase.co/auth/v1/admin/users?')) {
                return Http::response(['message' => 'temporarily unavailable'], 503);
            }

            return Http::response([], 404);
        });

        $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->getJson('/api/staff-accounts')
            ->assertStatus(502)
            ->assertJsonPath(
                'message',
                'Unable to retrieve staff invitation status. Please try again.'
            )
            ->assertJsonMissingPath('staff');

        Http::assertSentCount(2);
        Http::assertNotSent(fn (ClientRequest $request): bool => preg_match(
            '#/auth/v1/admin/users/[^?]+$#',
            $request->url()
        ) === 1);
    }

    public function test_missing_auth_user_does_not_change_another_staff_members_setup_state(): void
    {
        $this->createProfile(self::ADMIN_ID, self::ADMIN_EMAIL, 'System Administrator');
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'Department_Personnel');
        $verifiedStaffId = '33333333-3333-4333-8333-333333333333';
        $this->createProfile($verifiedStaffId, 'verified@example.com', 'LGU-Staff');

        Http::fake(function (ClientRequest $request) use ($verifiedStaffId) {
            if (str_ends_with($request->url(), '/auth/v1/user')) {
                return Http::response($this->authUserResponse(self::ADMIN_ID, self::ADMIN_EMAIL), 200);
            }

            if (str_starts_with($request->url(), 'https://example.supabase.co/auth/v1/admin/users?')) {
                return Http::response(['users' => [[
                    'id' => $verifiedStaffId,
                    'email' => 'verified@example.com',
                    'app_metadata' => [
                        SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
                    ],
                ]]], 200);
            }

            return Http::response([], 404);
        });

        $response = $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']))
            ->getJson('/api/staff-accounts');

        $response->assertOk()
            ->assertJsonPath('staff.0.email', self::STAFF_EMAIL)
            ->assertJsonPath('staff.0.invitation_setup_completed', null)
            ->assertJsonPath('staff.0.invitation_pending', false)
            ->assertJsonPath('staff.1.email', 'verified@example.com')
            ->assertJsonPath('staff.1.invitation_setup_completed', true)
            ->assertJsonPath('staff.1.invitation_pending', false);
    }

    public function test_staff_listing_remains_restricted_to_system_administrators(): void
    {
        $this->createProfile(self::STAFF_ID, self::STAFF_EMAIL, 'citizen');
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response(
                $this->authUserResponse(self::STAFF_ID, self::STAFF_EMAIL),
                200
            ),
        ]);

        $this->withToken($this->syntheticSupabaseToken(self::STAFF_ID, ['password']))
            ->getJson('/api/staff-accounts')
            ->assertForbidden();

        Http::assertNotSent(fn (ClientRequest $request): bool => str_contains(
            $request->url(),
            '/auth/v1/admin/users'
        ));
    }
}
