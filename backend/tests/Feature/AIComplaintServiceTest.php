<?php

namespace Tests\Feature;

use App\Exceptions\AIComplaintServiceException;
use App\Services\AIComplaintService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class AIComplaintServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('complaint_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
        });
        Schema::create('barangays', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->nullable();
        });

        config([
            'services.groq.api_key' => 'test-key',
            'services.groq.model' => 'test-model',
        ]);
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('barangays');
        Schema::dropIfExists('complaint_categories');

        parent::tearDown();
    }

    public function test_conversational_model_output_is_returned_without_failing_json_mode(): void
    {
        Http::fake([
            '*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => 'Which category best fits your concern?',
                    ],
                ]],
            ]),
        ]);

        $result = app(AIComplaintService::class)->chat([
            ['role' => 'user', 'text' => 'There is a rash in our area.'],
        ]);

        $this->assertSame(
            'Which category best fits your concern?',
            $result['reply']
        );
        $this->assertFalse($result['ready_for_review']);
        Http::assertSent(fn ($request) =>
            !array_key_exists('response_format', $request->data())
        );
    }

    public function test_provider_rate_limit_returns_a_clear_retry_message(): void
    {
        Http::fake(['*' => Http::response([
            'error' => ['code' => 'rate_limit_exceeded'],
        ], 429)]);

        try {
            app(AIComplaintService::class)->chat([
                ['role' => 'user', 'text' => 'Please help.'],
            ]);
            $this->fail('Expected a provider exception.');
        } catch (AIComplaintServiceException $exception) {
            $this->assertSame(503, $exception->httpStatus());
            $this->assertStringContainsString('wait a moment', $exception->getMessage());
        }
    }

    public function test_connection_failure_returns_a_clear_service_message(): void
    {
        Http::fake(function () {
            throw new ConnectionException('private connection detail');
        });

        try {
            app(AIComplaintService::class)->chat([
                ['role' => 'user', 'text' => 'Please help.'],
            ]);
            $this->fail('Expected a provider exception.');
        } catch (AIComplaintServiceException $exception) {
            $this->assertSame(503, $exception->httpStatus());
            $this->assertStringContainsString('could not connect', $exception->getMessage());
            $this->assertStringNotContainsString('private connection detail', $exception->getMessage());
        }
    }

    public function test_timeout_returns_a_friendly_message_without_exposing_exception_details(): void
    {
        Http::fake(function () {
            throw new ConnectionException('timeout with secret test-key');
        });

        try {
            app(AIComplaintService::class)->chat([
                ['role' => 'user', 'text' => 'Please help.'],
            ]);
            $this->fail('Expected a timeout exception to be translated.');
        } catch (AIComplaintServiceException $exception) {
            $this->assertSame(503, $exception->httpStatus());
            $this->assertStringContainsString('could not connect', $exception->getMessage());
            $this->assertStringNotContainsString('secret', $exception->getMessage());
        }
    }

    public function test_unsuccessful_provider_response_does_not_expose_provider_body(): void
    {
        Http::fake(['*' => Http::response([
            'error' => ['message' => 'private provider detail test-key'],
        ], 500)]);
        Log::shouldReceive('warning')->once()->with('AI provider returned an error.', Mockery::on(
            fn (array $context) => $context['status'] === 500
                && !str_contains(json_encode($context), 'private provider detail')
                && !str_contains(json_encode($context), 'test-key')
        ));

        try {
            app(AIComplaintService::class)->chat([
                ['role' => 'user', 'text' => 'Please help.'],
            ]);
            $this->fail('Expected a provider exception.');
        } catch (AIComplaintServiceException $exception) {
            $this->assertSame(503, $exception->httpStatus());
            $this->assertStringContainsString('Please try again', $exception->getMessage());
            $this->assertStringNotContainsString('private provider detail', $exception->getMessage());
        }
    }

    public function test_unexpected_provider_exception_is_logged_safely_and_translated(): void
    {
        Http::fake(function () {
            throw new \RuntimeException('private detail containing test-key');
        });
        Log::shouldReceive('error')->once()->with('AI provider request failed unexpectedly.', [
            'exception' => 'RuntimeException',
        ]);

        try {
            app(AIComplaintService::class)->chat([
                ['role' => 'user', 'text' => 'Please help.'],
            ]);
            $this->fail('Expected an unexpected provider exception to be translated.');
        } catch (AIComplaintServiceException $exception) {
            $this->assertSame(503, $exception->httpStatus());
            $this->assertStringContainsString('temporarily unavailable', $exception->getMessage());
            $this->assertStringNotContainsString('test-key', $exception->getMessage());
        }
    }
}
