<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AIComplaintController;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\VerifySupabaseToken;
use App\Services\AIComplaintService;
use Illuminate\Http\Request;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\TestCase;

class AIComplaintControllerTest extends TestCase
{
    private function requestWithMessages(array $messages): Request
    {
        return Request::create('/api/citizen/complaint-assistant/chat', 'POST', [
            'messages' => $messages,
        ]);
    }

    private function validResponse(): array
    {
        return [
            'reply' => 'How can I help?',
            'ready_for_review' => false,
            'draft' => [],
        ];
    }

    public function test_conversation_at_aggregate_limit_is_accepted(): void
    {
        $messages = array_fill(0, 10, ['role' => 'user', 'text' => str_repeat('a', 2000)]);
        $service = Mockery::mock(AIComplaintService::class);
        $service->shouldReceive('chat')->once()->with($messages)->andReturn($this->validResponse());

        $response = app(AIComplaintController::class)->chat(
            $this->requestWithMessages($messages),
            $service
        );

        $this->assertSame($this->validResponse(), $response->getData(true));
    }

    public function test_conversation_over_aggregate_limit_is_rejected_before_service_call(): void
    {
        $messages = array_fill(0, 11, ['role' => 'user', 'text' => str_repeat('a', 2000)]);
        $service = Mockery::mock(AIComplaintService::class);
        $service->shouldNotReceive('chat');

        try {
            app(AIComplaintController::class)->chat($this->requestWithMessages($messages), $service);
            $this->fail('Expected aggregate validation to fail.');
        } catch (ValidationException $exception) {
            $this->assertStringContainsString('20000 characters', $exception->errors()['messages'][0]);
        }
    }

    public function test_multiple_individually_valid_messages_cannot_exceed_aggregate_limit(): void
    {
        $messages = array_fill(0, 11, ['role' => 'user', 'text' => str_repeat('x', 2000)]);
        $service = Mockery::mock(AIComplaintService::class);
        $service->shouldNotReceive('chat');

        try {
            app(AIComplaintController::class)->chat($this->requestWithMessages($messages), $service);
            $this->fail('Expected aggregate validation to fail.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('messages', $exception->errors());
        }
    }

    public function test_existing_per_message_limit_is_preserved(): void
    {
        $messages = [['role' => 'user', 'text' => str_repeat('x', 2001)]];
        $service = Mockery::mock(AIComplaintService::class);
        $service->shouldNotReceive('chat');

        try {
            app(AIComplaintController::class)->chat($this->requestWithMessages($messages), $service);
            $this->fail('Expected per-message validation to fail.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('messages.0.text', $exception->errors());
        }
    }

    public function test_ai_route_uses_per_user_ten_per_minute_limit_with_friendly_429(): void
    {
        $route = collect(app('router')->getRoutes())->first(
            fn ($route) => $route->uri() === 'api/citizen/complaint-assistant/chat'
        );
        $this->assertContains('throttle:ai-complaint', $route->gatherMiddleware());
        $resolvedMiddleware = app('router')->resolveMiddleware(
            $route->gatherMiddleware(),
            $route->excludedMiddleware()
        );
        $this->assertCount(
            1,
            array_filter($resolvedMiddleware, fn ($middleware) => str_contains($middleware, 'ThrottleRequests'))
        );

        $limiter = RateLimiter::limiter('ai-complaint');
        $firstRequest = Request::create('/');
        $firstRequest->attributes->set('supabase_user', ['id' => 'citizen-one']);
        $secondRequest = Request::create('/');
        $secondRequest->attributes->set('supabase_user', ['id' => 'citizen-two']);

        $firstLimit = $limiter($firstRequest);
        $secondLimit = $limiter($secondRequest);

        $this->assertSame(10, $firstLimit->maxAttempts);
        $this->assertNotSame($firstLimit->key, $secondLimit->key);
        RateLimiter::clear($firstLimit->key);
        RateLimiter::clear($secondLimit->key);
        for ($attempt = 0; $attempt < 10; $attempt++) {
            RateLimiter::hit($firstLimit->key);
        }
        $this->assertTrue(RateLimiter::tooManyAttempts($firstLimit->key, 10));
        $this->assertFalse(RateLimiter::tooManyAttempts($secondLimit->key, 10));
        RateLimiter::clear($firstLimit->key);
        RateLimiter::clear($secondLimit->key);

        $response = ($firstLimit->responseCallback)();
        $this->assertSame(429, $response->getStatusCode());
        $this->assertStringContainsString('wait a moment', $response->getData(true)['message']);
    }

    public function test_route_accepts_ten_requests_then_returns_friendly_429(): void
    {
        $this->withoutMiddleware([VerifySupabaseToken::class, CheckRole::class]);
        $service = Mockery::mock(AIComplaintService::class);
        $service->shouldReceive('chat')->times(10)->andReturn($this->validResponse());
        $this->app->instance(AIComplaintService::class, $service);

        $payload = ['messages' => [['role' => 'user', 'text' => 'Please help.']]];
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson('/api/citizen/complaint-assistant/chat', $payload)
                ->assertOk();
        }

        $this->postJson('/api/citizen/complaint-assistant/chat', $payload)
            ->assertStatus(429)
            ->assertJsonPath('message', 'You have sent too many AI assistant requests. Please wait a moment and try again.');
    }

    public function test_ai_route_keeps_its_existing_authentication_requirement(): void
    {
        $this->postJson('/api/citizen/complaint-assistant/chat', [
            'messages' => [['role' => 'user', 'text' => 'Please help.']],
        ])->assertUnauthorized();
    }

    public function test_ai_route_rejects_authenticated_non_citizen_roles(): void
    {
        $administratorId = '44444444-4444-4444-8444-444444444444';
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        DB::table('profiles')->insert([
            'id' => $administratorId,
            'full_name' => 'Test Administrator',
            'email' => 'admin@example.test',
            'role' => 'System Administrator',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        config([
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.publishable_key' => 'test-publishable-key',
        ]);
        Http::fake([
            'https://example.supabase.co/auth/v1/user' => Http::response([
                'id' => $administratorId,
                'email' => 'admin@example.test',
            ], 200),
        ]);

        $service = Mockery::mock(AIComplaintService::class);
        $service->shouldNotReceive('chat');
        $this->app->instance(AIComplaintService::class, $service);

        $this->withToken($this->syntheticSupabaseToken($administratorId, ['password']))
            ->postJson('/api/citizen/complaint-assistant/chat', [
                'messages' => [['role' => 'user', 'text' => 'Please help.']],
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'You are not authorized to perform this action.');
    }
}
