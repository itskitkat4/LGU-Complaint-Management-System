<?php

namespace Tests;

use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    private bool $finding30PostgresTransactionStarted = false;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();

        if (getenv('FINDING30_POSTGRES_SUITE') !== '1') {
            return;
        }

        if (!app()->environment('testing')) {
            throw new RuntimeException('PostgreSQL integration tests require APP_ENV=testing.');
        }

        if (
            config('cache.default') !== 'array'
            || config('session.driver') !== 'array'
            || config('queue.default') !== 'sync'
        ) {
            throw new RuntimeException(
                'PostgreSQL integration tests require in-memory cache/session and the synchronous queue.'
            );
        }

        $connection = DB::connection();
        if (
            $connection->getDriverName() !== 'pgsql'
            || $connection->getDatabaseName() !== 'lgu_complaint_test'
        ) {
            throw new RuntimeException(
                'PostgreSQL integration tests are restricted to lgu_complaint_test using the pgsql driver.'
            );
        }

        $identity = $connection->selectOne(<<<'SQL'
            SELECT current_database() AS database_name,
                   host(inet_server_addr()) AS server_address,
                   inet_server_port() AS server_port
        SQL);

        if (
            $identity->database_name !== 'lgu_complaint_test'
            || $identity->server_address !== '127.0.0.1'
            || (int) $identity->server_port !== 5432
        ) {
            throw new RuntimeException(
                'PostgreSQL integration tests require the local disposable lgu_complaint_test database on 127.0.0.1:5432.'
            );
        }

        DB::beginTransaction();
        $this->finding30PostgresTransactionStarted = true;
    }

    protected function tearDown(): void
    {
        try {
            if ($this->finding30PostgresTransactionStarted && DB::transactionLevel() > 0) {
                DB::rollBack();
            }
        } finally {
            parent::tearDown();
        }
    }

    protected function syntheticSupabaseToken(string $subject, ?array $amr): string
    {
        $encode = static fn (array $value): string => rtrim(
            strtr(base64_encode(json_encode($value, JSON_THROW_ON_ERROR)), '+/', '-_'),
            '='
        );
        $claims = [
            'sub' => $subject,
            'session_id' => 'synthetic-session-id',
            'exp' => time() + 3600,
        ];
        if ($amr !== null) {
            $claims['amr'] = $amr;
        }

        return implode('.', [
            $encode(['alg' => 'HS256', 'typ' => 'JWT']),
            $encode($claims),
            $encode(['synthetic' => true]),
        ]);
    }

    protected function syntheticSupabaseSubject(string $authorization): ?string
    {
        if (!str_starts_with($authorization, 'Bearer ')) {
            return null;
        }

        $parts = explode('.', substr($authorization, 7));
        if (count($parts) !== 3) {
            return null;
        }

        $payload = base64_decode(strtr($parts[1], '-_', '+/'), true);
        if ($payload === false) {
            return null;
        }

        $claims = json_decode($payload, true);

        return is_array($claims) && is_string($claims['sub'] ?? null)
            ? $claims['sub']
            : null;
    }
}
