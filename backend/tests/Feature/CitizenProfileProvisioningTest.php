<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Services\SupabaseAdminService;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use PDOException;
use Tests\TestCase;

class CitizenProfileProvisioningTest extends TestCase
{
    private const CITIZEN_ID = '11111111-1111-4111-8111-111111111111';
    private const STAFF_ID = '22222222-2222-4222-8222-222222222222';
    private const CITIZEN_EMAIL = 'citizen@example.com';
    private const STAFF_EMAIL = 'personnel@example.com';
    private string $accessToken;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.publishable_key' => 'test-publishable-key',
        ]);

        Schema::dropIfExists('profiles');
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email')->unique('profiles_email_unique');
            $table->string('role');
            $table->uuid('barangay_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    private function authenticatedUser(array $overrides = []): array
    {
        return array_replace_recursive([
            'id' => self::CITIZEN_ID,
            'email' => self::CITIZEN_EMAIL,
            'app_metadata' => [
                'provider' => 'google',
                'providers' => ['google'],
            ],
            'user_metadata' => ['name' => 'Google Citizen'],
        ], $overrides);
    }

    private function fakeAuthenticatedUser(array $user, ?array $amr = null): void
    {
        $provider = $user['app_metadata']['provider'] ?? null;
        $amr ??= $provider === 'email' ? ['password'] : ['oauth'];
        $this->accessToken = $this->syntheticSupabaseToken(
            is_string($user['id'] ?? null) ? $user['id'] : self::CITIZEN_ID,
            $amr
        );

        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response($user, 200),
        ]);
    }

    private function simulateProfileInsertException(PDOException $previous): void
    {
        $insertIntercepted = false;

        DB::beforeExecuting(function (string $query, array $bindings) use (
            &$insertIntercepted,
            $previous
        ): void {
            if (
                !$insertIntercepted
                && str_contains(strtolower($query), 'insert into "profiles"')
            ) {
                $insertIntercepted = true;
                throw new QueryException('pgsql', $query, $bindings, $previous);
            }
        });
    }

    public function test_orphaned_pending_personnel_identity_cannot_create_a_citizen_profile(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser([
            'app_metadata' => [
                SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => false,
            ],
        ]));

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertForbidden();

        $this->assertDatabaseMissing('profiles', ['id' => self::CITIZEN_ID]);
    }

    public function test_pending_personnel_identity_with_a_profile_cannot_use_citizen_provisioning(): void
    {
        Profile::create([
            'id' => self::STAFF_ID,
            'full_name' => 'Pending Personnel',
            'email' => self::STAFF_EMAIL,
            'role' => 'Department_Personnel',
            'is_active' => true,
        ]);

        $this->fakeAuthenticatedUser([
            'id' => self::STAFF_ID,
            'email' => self::STAFF_EMAIL,
            'app_metadata' => [
                SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => false,
            ],
        ]);

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertForbidden();

        $this->assertDatabaseHas('profiles', [
            'id' => self::STAFF_ID,
            'role' => 'Department_Personnel',
        ]);
        $this->assertDatabaseMissing('profiles', ['id' => self::CITIZEN_ID]);
    }

    public function test_completed_google_identity_can_create_a_citizen_profile(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser([
            'app_metadata' => [
                SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
                'provider' => 'google',
                'providers' => ['google'],
            ],
        ]));

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('profile.role', 'citizen')
            ->assertJsonPath('profile.email', self::CITIZEN_EMAIL);

        $this->assertDatabaseHas('profiles', [
            'id' => self::CITIZEN_ID,
            'role' => 'citizen',
        ]);
    }

    public function test_duplicate_profile_email_constraint_returns_safe_conflict_response(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser());
        $this->simulateProfileInsertException(new PDOException(
            'SQLSTATE[23505]: Unique violation: 7 ERROR: duplicate key value violates unique constraint "profiles_email_unique"',
            '23505'
        ));

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertStatus(409)
            ->assertExactJson([
                'message' => 'This email address is already associated with an existing profile.',
            ])
            ->assertDontSee('SQLSTATE')
            ->assertDontSee('profiles_email_unique');
    }

    public function test_unrelated_unique_constraint_violation_is_not_returned_as_email_conflict(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser());
        $this->simulateProfileInsertException(new PDOException(
            'SQLSTATE[23505]: Unique violation: duplicate key value violates unique constraint "profiles_id_unique"',
            '23505'
        ));

        $response = $this->withToken($this->accessToken)->getJson('/api/profile');

        $response->assertStatus(500)
            ->assertDontSee('profiles_id_unique')
            ->assertDontSee('SQLSTATE');
    }

    public function test_other_database_exception_retains_server_error_behavior(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser());
        $this->simulateProfileInsertException(new PDOException(
            'SQLSTATE[40001]: Serialization failure',
            '40001'
        ));

        $response = $this->withToken($this->accessToken)->getJson('/api/profile');

        $response->assertStatus(500)
            ->assertDontSee('Serialization failure')
            ->assertDontSee('SQLSTATE');
    }

    public function test_email_password_session_with_linked_google_identity_cannot_create_a_citizen_profile(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser([
            'app_metadata' => [
                'provider' => 'email',
                'providers' => ['email', 'google'],
            ],
            'identities' => [
                ['provider' => 'email'],
                ['provider' => 'google'],
            ],
        ]));

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertForbidden();

        $this->assertDatabaseMissing('profiles', ['id' => self::CITIZEN_ID]);
    }

    public function test_non_google_identity_cannot_create_a_citizen_profile(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser([
            'app_metadata' => [
                'provider' => 'email',
                'providers' => ['email'],
            ],
            'identities' => [['provider' => 'email']],
        ]));

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertForbidden();

        $this->assertDatabaseMissing('profiles', ['id' => self::CITIZEN_ID]);
    }

    public function test_frontend_provider_fields_cannot_bypass_google_requirement(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser([
            'app_metadata' => [
                'provider' => 'email',
                'providers' => ['email'],
            ],
            'identities' => [['provider' => 'email']],
        ]));

        $this->withToken($this->accessToken)
            ->json('GET', '/api/profile?provider=google', [
                'provider' => 'google',
                'app_metadata' => ['provider' => 'google', 'providers' => ['google']],
                'identities' => [['provider' => 'google']],
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('profiles', ['id' => self::CITIZEN_ID]);
    }

    public function test_missing_or_malformed_provider_metadata_is_rejected_safely(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser([
            'app_metadata' => [
                SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
                'provider' => 'email',
                'providers' => 'google',
            ],
            'identities' => 'google',
        ]));

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertForbidden();

        $this->assertDatabaseMissing('profiles', ['id' => self::CITIZEN_ID]);
    }

    public function test_missing_amr_cannot_provision_a_new_citizen_profile(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser(), null);
        $this->accessToken = $this->syntheticSupabaseToken(self::CITIZEN_ID, null);

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertForbidden();

        $this->assertDatabaseMissing('profiles', ['id' => self::CITIZEN_ID]);
    }

    public function test_oauth_session_with_additional_linked_identities_can_provision_a_citizen(): void
    {
        $this->fakeAuthenticatedUser($this->authenticatedUser([
            'identities' => [
                ['provider' => 'google'],
                ['provider' => 'email'],
            ],
        ]));

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('profile.role', 'citizen');
    }

    public function test_existing_citizen_profile_remains_accessible_without_provider_metadata(): void
    {
        Profile::create([
            'id' => self::CITIZEN_ID,
            'full_name' => 'Existing Citizen',
            'email' => self::CITIZEN_EMAIL,
            'role' => 'citizen',
            'is_active' => true,
        ]);
        $this->fakeAuthenticatedUser([
            'id' => self::CITIZEN_ID,
            'email' => self::CITIZEN_EMAIL,
        ]);

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('profile.full_name', 'Existing Citizen');

        $this->assertSame(1, Profile::where('id', self::CITIZEN_ID)->count());
    }

    public function test_completed_personnel_email_password_session_and_role_checks_remain_intact(): void
    {
        Profile::create([
            'id' => self::STAFF_ID,
            'full_name' => 'Active Personnel',
            'email' => self::STAFF_EMAIL,
            'role' => 'Department_Personnel',
            'is_active' => true,
        ]);
        $this->fakeAuthenticatedUser([
            'id' => self::STAFF_ID,
            'email' => self::STAFF_EMAIL,
            'app_metadata' => [
                SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
                'provider' => 'email',
                'providers' => ['email'],
            ],
        ]);

        $this->withToken($this->accessToken)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', self::STAFF_ID);

        $this->withToken($this->accessToken)
            ->postJson('/api/staff-accounts', [])
            ->assertForbidden();
    }

    public function test_completed_personnel_account_rejects_google_session_even_when_google_is_linked(): void
    {
        Profile::create([
            'id' => self::STAFF_ID,
            'full_name' => 'Active Personnel',
            'email' => self::STAFF_EMAIL,
            'role' => 'Department_Personnel',
            'is_active' => true,
        ]);
        $this->fakeAuthenticatedUser([
            'id' => self::STAFF_ID,
            'email' => self::STAFF_EMAIL,
            'app_metadata' => [
                SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
                'provider' => 'email',
                'providers' => ['email', 'google'],
            ],
            'identities' => [
                ['provider' => 'email'],
                ['provider' => 'google'],
            ],
        ], ['oauth']);

        $this->withToken($this->accessToken)
            ->getJson('/api/auth/me')
            ->assertForbidden();
    }

    public function test_system_administrator_account_rejects_google_session(): void
    {
        Profile::create([
            'id' => self::STAFF_ID,
            'full_name' => 'System Administrator',
            'email' => self::STAFF_EMAIL,
            'role' => 'System Administrator',
            'is_active' => true,
        ]);
        $this->fakeAuthenticatedUser([
            'id' => self::STAFF_ID,
            'email' => self::STAFF_EMAIL,
            'app_metadata' => [
                'provider' => 'email',
                'providers' => ['email', 'google'],
            ],
            'identities' => [
                ['provider' => 'email'],
                ['provider' => 'google'],
            ],
        ], ['oauth']);

        $this->withToken($this->accessToken)
            ->getJson('/api/auth/me')
            ->assertForbidden();
    }

    public function test_missing_authentication_identity_fields_are_rejected_without_profile_creation(): void
    {
        $this->fakeAuthenticatedUser([
            'email' => self::CITIZEN_EMAIL,
            'app_metadata' => ['provider' => 'google'],
        ]);

        $this->withToken($this->accessToken)
            ->getJson('/api/profile')
            ->assertUnauthorized();

        $this->assertDatabaseMissing('profiles', ['email' => self::CITIZEN_EMAIL]);
    }
}
