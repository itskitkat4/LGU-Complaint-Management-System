<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

$expectedHost = '127.0.0.1';
$expectedPort = '5432';
$expectedDatabase = 'lgu_complaint_test';
$expectedUsername = 'postgres';
$expectedComment = 'Codex disposable backend test database';

$configuration = [
    'FINDING30_PG_HOST' => getenv('FINDING30_PG_HOST'),
    'FINDING30_PG_PORT' => getenv('FINDING30_PG_PORT'),
    'FINDING30_PG_DATABASE' => getenv('FINDING30_PG_DATABASE'),
    'FINDING30_PG_USERNAME' => getenv('FINDING30_PG_USERNAME'),
];

foreach ($configuration as $name => $value) {
    if (!is_string($value) || $value === '') {
        fwrite(STDERR, "PostgreSQL test run refused: set {$name} explicitly.\n");
        exit(2);
    }
}

if (
    $configuration['FINDING30_PG_HOST'] !== $expectedHost
    || $configuration['FINDING30_PG_PORT'] !== $expectedPort
    || $configuration['FINDING30_PG_DATABASE'] !== $expectedDatabase
    || $configuration['FINDING30_PG_USERNAME'] !== $expectedUsername
) {
    fwrite(
        STDERR,
        "PostgreSQL test run refused: only {$expectedUsername}@{$expectedHost}:{$expectedPort}/{$expectedDatabase} is allowed.\n"
    );
    exit(2);
}

if (!extension_loaded('pdo_pgsql')) {
    fwrite(STDERR, "PostgreSQL test run refused: the pdo_pgsql PHP extension is not installed.\n");
    exit(2);
}

$password = getenv('FINDING30_PG_PASSWORD');
$password = is_string($password) ? $password : '';
$dsn = "pgsql:host={$expectedHost};port={$expectedPort};dbname={$expectedDatabase}";

try {
    $pdo = new PDO($dsn, $expectedUsername, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $identity = $pdo->query(<<<'SQL'
        SELECT current_database() AS database_name,
               host(inet_server_addr()) AS server_address,
               inet_server_port() AS server_port,
               shobj_description(oid, 'pg_database') AS database_comment
        FROM pg_database
        WHERE datname = current_database()
    SQL)->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    fwrite(
        STDERR,
        "PostgreSQL test run refused: cannot connect to the required local PostgreSQL test database. "
        . "Check the server, credentials, and database comment; no tests were run.\n"
    );
    exit(2);
}

if (
    $identity['database_name'] !== $expectedDatabase
    || $identity['server_address'] !== $expectedHost
    || (string) $identity['server_port'] !== $expectedPort
    || $identity['database_comment'] !== $expectedComment
) {
    fwrite(STDERR, 'Observed PostgreSQL identity: ' . json_encode([
        'database' => $identity['database_name'] ?? null,
        'address' => $identity['server_address'] ?? null,
        'port' => $identity['server_port'] ?? null,
        'disposable_marker' => $identity['database_comment'] ?? null,
    ], JSON_UNESCAPED_SLASHES) . "\n");
    fwrite(
        STDERR,
        "PostgreSQL test run refused: the connected server/database identity or disposable-database marker did not match.\n"
    );
    exit(2);
}

fwrite(STDOUT, "Verified disposable PostgreSQL target: {$expectedHost}:{$expectedPort}/{$expectedDatabase}.\n");
fwrite(STDOUT, "The target schema will be reset by migrate:fresh; database credentials are not displayed.\n");

foreach ([
    'APP_ENV' => 'testing',
    'BROADCAST_CONNECTION' => 'null',
    'CACHE_STORE' => 'array',
    'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => $expectedHost,
    'DB_PORT' => $expectedPort,
    'DB_DATABASE' => $expectedDatabase,
    'DB_USERNAME' => $expectedUsername,
    'DB_PASSWORD' => $password,
    'DB_URL' => '',
    'DB_SSLMODE' => 'disable',
    'MAIL_MAILER' => 'array',
    'QUEUE_CONNECTION' => 'sync',
    'SESSION_DRIVER' => 'array',
    'FINDING30_POSTGRES_SUITE' => '1',
    'FINDING30_PG_DSN' => $dsn,
    'FINDING30_PG_USER' => $expectedUsername,
    'FINDING30_PG_PASSWORD' => $password,
] as $name => $value) {
    putenv("{$name}={$value}");
    $_ENV[$name] = $value;
    $_SERVER[$name] = $value;
}

require dirname(__DIR__) . '/vendor/autoload.php';
$app = require dirname(__DIR__) . '/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
Artisan::call('config:clear');

config([
    'app.env' => 'testing',
    'database.default' => 'pgsql',
    'database.connections.pgsql.driver' => 'pgsql',
    'database.connections.pgsql.url' => null,
    'database.connections.pgsql.host' => $expectedHost,
    'database.connections.pgsql.port' => $expectedPort,
    'database.connections.pgsql.database' => $expectedDatabase,
    'database.connections.pgsql.username' => $expectedUsername,
    'database.connections.pgsql.password' => $password,
    'database.connections.pgsql.sslmode' => 'disable',
]);

DB::purge('pgsql');
$connection = DB::connection('pgsql');
$laravelIdentity = $connection->selectOne(<<<'SQL'
    SELECT current_database() AS database_name,
           host(inet_server_addr()) AS server_address,
           inet_server_port() AS server_port
SQL);

if (
    $connection->getDriverName() !== 'pgsql'
    || $connection->getDatabaseName() !== $expectedDatabase
    || $laravelIdentity->database_name !== $expectedDatabase
    || $laravelIdentity->server_address !== $expectedHost
    || (int) $laravelIdentity->server_port !== (int) $expectedPort
) {
    fwrite(STDERR, "PostgreSQL test run refused: Laravel resolved an unexpected database connection.\n");
    exit(2);
}

$migrationExitCode = Artisan::call('migrate:fresh', [
    '--database' => 'pgsql',
    '--force' => true,
]);
fwrite(STDOUT, Artisan::output());

if ($migrationExitCode !== 0) {
    fwrite(STDERR, "PostgreSQL test run stopped because migrate:fresh failed.\n");
    exit($migrationExitCode);
}

$projectRoot = dirname(__DIR__);
$runPhpUnitSuite = static function (string $suite) use ($projectRoot): int {
    fwrite(STDOUT, "Running PostgreSQL suite: {$suite}.\n");

    $process = proc_open(
        [
            PHP_BINARY,
            $projectRoot . '/vendor/bin/phpunit',
            '--configuration=' . $projectRoot . '/phpunit.pgsql.xml',
            '--testsuite=' . $suite,
            '--fail-on-skipped',
        ],
        [0 => STDIN, 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes,
        $projectRoot
    );

    if (!is_resource($process)) {
        fwrite(STDERR, "PostgreSQL test run failed to start PHPUnit.\n");
        return 2;
    }

    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);

    if ($stdout !== '') {
        fwrite(STDOUT, $stdout);
    }
    if ($stderr !== '') {
        fwrite(STDERR, $stderr);
    }

    $exitCode = proc_close($process);
    if ($exitCode === 0 && !preg_match('/"tests"\s*:\s*[1-9][0-9]*/', $stdout)) {
        fwrite(STDERR, "PostgreSQL suite '{$suite}' did not report any executed tests.\n");
        return 2;
    }

    fwrite(STDOUT, "PostgreSQL suite '{$suite}' exit code: {$exitCode}.\n");

    return $exitCode;
};

$migrationSuiteExitCode = $runPhpUnitSuite('PostgreSQL migrations and catalog');
if ($migrationSuiteExitCode !== 0) {
    exit($migrationSuiteExitCode);
}

// The following controller tests create their own minimal table fixtures.
// Reset only the already-verified, explicitly marked disposable test schema.
$pdo->exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;');
fwrite(STDOUT, "Verified disposable public schema reset for SQL compatibility fixtures.\n");

exit($runPhpUnitSuite('PostgreSQL SQL compatibility'));
