<?php

namespace Tests\Unit;

use App\Services\SupabaseAdminService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use Tests\TestCase;

class SupabaseAdminServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.secret_key' => 'test-secret',
            'services.supabase.frontend_url' => 'https://bantay.example.com',
        ]);
    }

    public function test_invitation_email_rate_limit_is_exposed_as_a_retryable_service_error(): void
    {
        Http::fake([
            'https://example.supabase.co/auth/v1/invite*' => Http::response([
                'msg' => 'email rate limit exceeded',
            ], 429),
        ]);

        try {
            app(SupabaseAdminService::class)->inviteUser('personnel@example.com');
            $this->fail('A rate-limited invitation must not be reported as successful.');
        } catch (\RuntimeException $exception) {
            $this->assertSame(429, $exception->getCode());
            $this->assertSame(
                'Supabase invitation email rate limit exceeded.',
                $exception->getMessage()
            );
        }
    }

    public function test_invitation_redirect_requires_an_explicit_public_https_frontend_url(): void
    {
        config(['services.supabase.frontend_url' => null]);
        Http::fake();

        try {
            app(SupabaseAdminService::class)->inviteUser('personnel@example.com');
            $this->fail('An invitation must not be sent without a configured frontend URL.');
        } catch (InvalidArgumentException $exception) {
            $this->assertStringContainsString('FRONTEND_URL', $exception->getMessage());
        }

        Http::assertNothingSent();
    }

    public function test_invitation_redirect_rejects_localhost_frontend_urls(): void
    {
        config(['services.supabase.frontend_url' => 'http://localhost:5173']);
        Http::fake();

        try {
            app(SupabaseAdminService::class)->inviteUser('personnel@example.com');
            $this->fail('An invitation must not redirect external recipients to localhost.');
        } catch (InvalidArgumentException $exception) {
            $this->assertStringContainsString('public HTTPS frontend URL', $exception->getMessage());
        }

        Http::assertNothingSent();
    }

    public function test_auth_user_lookup_returns_email_confirmation_state(): void
    {
        $requestOptions = [];
        Http::fake(function (Request $request, array $options) use (&$requestOptions) {
            $requestOptions = $options;

            return Http::response([
                'user' => [
                    'id' => 'user-123',
                    'email' => 'personnel@example.com',
                    'email_confirmed_at' => null,
                ],
            ], 200);
        });

        $user = app(SupabaseAdminService::class)->getUser('user-123');

        $this->assertSame('user-123', $user['id']);
        $this->assertNull($user['email_confirmed_at']);
        $this->assertSame(10, $requestOptions['timeout']);
    }

    public function test_update_auth_user_uses_a_10_second_timeout(): void
    {
        $updateOptions = [];
        Http::fake(function (Request $request, array $options) use (&$updateOptions) {
            if ($request->method() === 'PUT') {
                $updateOptions = $options;
            }

            if ($request->method() === 'GET') {
                return Http::response(['user' => [
                    'id' => 'user-123',
                    'app_metadata' => [],
                ]], 200);
            }

            return Http::response([], 200);
        });

        app(SupabaseAdminService::class)->markPasswordSetupPending('user-123');

        $this->assertSame(10, $updateOptions['timeout']);
    }

    public function test_delete_user_uses_service_role_headers_and_auth_user_endpoint(): void
    {
        $deleteOptions = [];
        Http::fake(function (Request $request, array $options) use (&$deleteOptions) {
            $deleteOptions = $options;

            return Http::response([], 200);
        });

        app(SupabaseAdminService::class)->deleteUser('user-123');

        Http::assertSent(fn (Request $request): bool => $request->method() === 'DELETE'
            && $request->url() === 'https://example.supabase.co/auth/v1/admin/users/user-123'
            && $request->hasHeader('apikey', 'test-secret')
            && $request->hasHeader('Authorization', 'Bearer test-secret'));
        $this->assertSame(10, $deleteOptions['timeout']);
        Http::assertSentCount(1);
    }

    public function test_delete_user_preserves_failure_exception(): void
    {
        Http::fake([
            'https://example.supabase.co/auth/v1/admin/users/user-123' => Http::response([
                'message' => 'Deletion rejected',
            ], 500),
        ]);

        try {
            app(SupabaseAdminService::class)->deleteUser('user-123');
            $this->fail('A failed Auth deletion must raise the existing service error.');
        } catch (\RuntimeException $exception) {
            $this->assertSame(
                'Failed to delete the Supabase Auth User .',
                $exception->getMessage()
            );
        }
    }

    public function test_new_invitation_is_marked_pending_in_trusted_app_metadata(): void
    {
        Http::fake([
            'https://example.supabase.co/auth/v1/admin/users/user-123' => Http::sequence()
                ->push(['user' => [
                    'id' => 'user-123',
                    'app_metadata' => ['provider' => 'email', 'providers' => ['email']],
                ]], 200)
                ->push([], 200),
        ]);

        app(SupabaseAdminService::class)->markPasswordSetupPending('user-123');

        Http::assertSent(fn (Request $request): bool => $request->method() === 'PUT'
            && $request->url() === 'https://example.supabase.co/auth/v1/admin/users/user-123'
            && $request->data() === ['app_metadata' => [
                'provider' => 'email',
                'providers' => ['email'],
                SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => false,
            ]]);
    }

    public function test_password_and_completed_marker_are_written_in_one_admin_update(): void
    {
        Http::fake([
            'https://example.supabase.co/auth/v1/admin/users/user-123' => Http::sequence()
                ->push(['user' => [
                    'id' => 'user-123',
                    'email' => 'user@example.com',
                    'app_metadata' => [
                        'provider' => 'email',
                        SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => false,
                    ],
                ]], 200)
                ->push([], 200),
        ]);

        app(SupabaseAdminService::class)->setPasswordAndMarkSetupComplete(
            'user-123',
            'user@example.com',
            'ValidPassword1!'
        );

        Http::assertSent(fn (Request $request): bool => $request->method() === 'PUT'
            && $request->url() === 'https://example.supabase.co/auth/v1/admin/users/user-123'
            && $request->data() === [
                'password' => 'ValidPassword1!',
                'app_metadata' => [
                    'provider' => 'email',
                    SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
                ],
            ]);
    }

    public function test_failed_auth_password_update_throws_without_a_follow_up_completion_write(): void
    {
        Http::fake([
            'https://example.supabase.co/auth/v1/admin/users/user-123' => Http::sequence()
                ->push(['user' => [
                    'id' => 'user-123',
                    'email' => 'user@example.com',
                    'app_metadata' => [SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => false],
                ]], 200)
                ->push(['msg' => 'Password rejected'], 422),
        ]);

        try {
            app(SupabaseAdminService::class)->setPasswordAndMarkSetupComplete(
                'user-123',
                'user@example.com',
                'ValidPassword1!'
            );
            $this->fail('A rejected Auth update must fail password setup.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Supabase could not update the staff password.', $exception->getMessage());
        }

        Http::assertSentCount(2);
        Http::assertNotSent(fn (Request $request): bool => $request->method() === 'PUT'
            && $request->data() === ['app_metadata' => [
                SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
            ]]);
    }
}
