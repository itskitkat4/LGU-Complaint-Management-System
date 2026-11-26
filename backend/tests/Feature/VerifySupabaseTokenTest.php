<?php

namespace Tests\Feature;

use App\Http\Middleware\VerifySupabaseToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class VerifySupabaseTokenTest extends TestCase
{
    private function verifySyntheticToken(string $token, array $verifiedUser): array
    {
        config([
            'services.supabase.url' => 'https://project.supabase.co',
            'services.supabase.publishable_key' => 'test-publishable-key-secret',
        ]);
        Schema::dropIfExists('profiles');
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Http::fake([
            'https://project.supabase.co/auth/v1/user' => Http::response($verifiedUser, 200),
        ]);

        $request = Request::create('/api/auth/me', 'GET');
        $request->headers->set('Authorization', 'Bearer ' . $token);

        $response = app(VerifySupabaseToken::class)->handle(
            $request,
            fn (Request $request) => response()->json([
                'claims' => $request->attributes->get('supabase_auth_claims'),
                'amr_methods' => $request->attributes->get('supabase_amr_methods'),
            ])
        );

        return [$response, $request];
    }

    private function syntheticToken(string $subject, array $amr): string
    {
        return $this->syntheticSupabaseToken($subject, $amr);
    }

    public function test_valid_string_amr_is_attached_after_supabase_verification(): void
    {
        $userId = '11111111-1111-4111-8111-111111111111';
        [$response, $request] = $this->verifySyntheticToken(
            $this->syntheticToken($userId, ['oauth']),
            ['id' => $userId, 'email' => 'citizen@example.com']
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(
            $userId,
            $request->attributes->get('supabase_auth_claims')['sub']
        );
        $this->assertSame(['oauth'], $request->attributes->get('supabase_amr_methods'));
    }

    public function test_valid_object_amr_is_attached_after_supabase_verification(): void
    {
        $userId = '11111111-1111-4111-8111-111111111111';
        [$response, $request] = $this->verifySyntheticToken(
            $this->syntheticToken($userId, [[
                'method' => 'password',
                'timestamp' => 1795200000,
            ]]),
            ['id' => $userId, 'email' => 'personnel@example.com']
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['password'], $request->attributes->get('supabase_amr_methods'));
    }

    public function test_malformed_jwt_is_rejected_before_supabase_request(): void
 {
        [$response] = $this->verifySyntheticToken(
            'not.a.jwt',
            [
                'id' => '11111111-1111-4111-8111-111111111111',
                'email' => 'citizen@example.com',
            ]
        );

        $this->assertSame(401, $response->getStatusCode());
    Http::assertNothingSent();
    }

    public function test_jwt_subject_mismatch_is_rejected(): void
    {
        [$response] = $this->verifySyntheticToken(
            $this->syntheticToken('11111111-1111-4111-8111-111111111111', ['oauth']),
            [
                'id' => '22222222-2222-4222-8222-222222222222',
                'email' => 'citizen@example.com',
            ]
        );

        $this->assertSame(401, $response->getStatusCode());
    }

    public function test_malformed_amr_is_rejected(): void
    {
        $userId = '11111111-1111-4111-8111-111111111111';
        $token = $this->syntheticSupabaseToken($userId, []);
        $parts = explode('.', $token);
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        $payload['amr'] = [['method' => 'oauth']];
        $parts[1] = rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');

        [$response] = $this->verifySyntheticToken(
            implode('.', $parts),
            ['id' => $userId, 'email' => 'citizen@example.com']
        );

        $this->assertSame(401, $response->getStatusCode());
    }

    public function test_non_success_supabase_response_is_logged_safely_and_still_returns_401(): void
    {
        $userId = '33333333-3333-4333-8333-333333333333';
        $accessToken = $this->syntheticSupabaseToken($userId, ['oauth']);
        $publishableKey = 'test-publishable-key-secret';
        $personalData = 'private-person@example.test';
        $requestId = 'c4e3b2a1-7654-4abc-8def-0123456789ab';

        config([
            'services.supabase.url' => 'https://project.supabase.co',
            'services.supabase.publishable_key' => $publishableKey,
        ]);

        Http::fake([
            'https://project.supabase.co/auth/v1/user' => Http::response([
                'error_code' => $publishableKey,
                'code' => 'invalid_jwt',
                'error' => $accessToken,
                'message' => "Rejected {$personalData}; {$accessToken}; {$publishableKey}",
            ], 401),
        ]);

        Log::shouldReceive('warning')
            ->once()
            ->with(
                'Supabase user verification failed.',
                Mockery::on(function (array $context) use ($requestId, $accessToken, $publishableKey, $personalData) {
                    $this->assertSame([
                        'upstream_status' => 401,
                        'error_description' => 'Supabase Auth user verification returned a non-success status.',
                        'supabase_error_code' => 'invalid_jwt',
                        'request_id' => $requestId,
                    ], $context);

                    $serializedContext = json_encode($context);
                    $this->assertIsString($serializedContext);
                    $this->assertStringNotContainsString($accessToken, $serializedContext);
                    $this->assertStringNotContainsString($publishableKey, $serializedContext);
                    $this->assertStringNotContainsString($personalData, $serializedContext);

                    return true;
                })
            );

        $request = Request::create('/api/complaints?page=1', 'GET');
        $request->headers->set('Authorization', "Bearer {$accessToken}");
        $request->headers->set('X-Request-ID', $requestId);

        $response = app(VerifySupabaseToken::class)->handle(
            $request,
            fn () => response()->noContent()
        );

        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame(
            ['message' => 'Invalid or Expired token.'],
            $response->getData(true)
        );
    }

   public function test_supabase_connection_failure_still_returns_503(): void
{
    config([
        'services.supabase.url' => 'https://project.supabase.co',
        'services.supabase.publishable_key' => 'test-publishable-key-secret',
    ]);

    $userId = '22222222-2222-4222-8222-222222222222';
    $accessToken = $this->syntheticSupabaseToken($userId, ['oauth']);

    Http::fake([
        'https://project.supabase.co/auth/v1/user' => Http::failedConnection(),
    ]);

    $request = Request::create('/api/complaints?page=1', 'GET');
    $request->headers->set('Authorization', 'Bearer ' . $accessToken);

    $response = app(VerifySupabaseToken::class)->handle(
        $request,
        fn () => response()->noContent()
    );

    $this->assertSame(503, $response->getStatusCode());
    $this->assertSame(
        ['message' => 'Authentication service is unavailable.'],
        $response->getData(true)
    );
}
    public function test_missing_bearer_token_still_returns_401_without_upstream_call(): void
    {
        Http::fake();

        $request = Request::create('/api/complaints?page=1', 'GET');
        $response = app(VerifySupabaseToken::class)->handle(
            $request,
            fn () => response()->noContent()
        );

        Http::assertNothingSent();
        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame(
            ['message' => 'Unauthenticated'],
            $response->getData(true)
        );
    }
}
