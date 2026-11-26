<?php

namespace Tests\Unit;

use Tests\TestCase;

class DatabaseIsolationProbeTest extends TestCase
{
    public function test_phpunit_uses_sqlite_in_memory(): void
    {
        $this->assertSame('testing', app()->environment());
        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame('sqlite', config('database.connections.sqlite.driver'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
    }
}
