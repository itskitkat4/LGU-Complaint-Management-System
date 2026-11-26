<?php

namespace Tests\Feature;

use PDO;
use Tests\TestCase;

class PostgresQueryIndexesTest extends TestCase
{
    public function test_postgres_has_the_existing_query_indexes_and_no_duplicate_assignment_index(): void
    {
        if (getenv('FINDING30_POSTGRES_SUITE') !== '1') {
            $this->markTestSkipped('Run composer test:postgres to execute PostgreSQL integration tests.');
        }
        $dsn = getenv('FINDING30_PG_DSN');

        $pdo = new PDO(
            $dsn,
            getenv('FINDING30_PG_USER') ?: 'postgres',
            getenv('FINDING30_PG_PASSWORD') ?: '',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );

        $indexes = $pdo->query(<<<'SQL'
            SELECT table_name.relname AS table_name,
                   index_name.relname AS index_name,
                   pg_get_indexdef(index_info.indexrelid) AS definition,
                   index_info.indisunique AS is_unique,
                   index_info.indisvalid AS is_valid,
                   index_info.indisready AS is_ready,
                   COALESCE(pg_get_expr(index_info.indpred, index_info.indrelid), '') AS predicate
            FROM pg_index AS index_info
            JOIN pg_class AS index_name ON index_name.oid = index_info.indexrelid
            JOIN pg_class AS table_name ON table_name.oid = index_info.indrelid
            JOIN pg_namespace AS schema_name ON schema_name.oid = table_name.relnamespace
            WHERE schema_name.nspname = 'public'
              AND table_name.relname IN ('complaints', 'complaint_assignments', 'notifications')
            ORDER BY table_name.relname, index_name.relname
        SQL)->fetchAll(PDO::FETCH_ASSOC);

        foreach ([
            'complaints_pkey',
            'complaints_citizen_id_index',
            'complaints_barangay_id_index',
            'complaints_status_index',
            'complaint_assignments_pkey',
            'complaint_assignments_complaint_id_assigned_at_index',
            'complaint_assignments_assigned_to_ended_at_index',
            'complaint_assignments_assignment_level_index',
            'complaint_assignments_one_active_per_complaint_unique',
            'notifications_pkey',
            'notifications_profile_id_created_at_index',
            'notifications_profile_id_is_read_index',
        ] as $requiredIndex) {
            $matches = array_values(array_filter(
                $indexes,
                fn (array $index): bool => $index['index_name'] === $requiredIndex
            ));
            $this->assertCount(1, $matches, "Expected exactly one {$requiredIndex} index.");
            $this->assertTrue(filter_var($matches[0]['is_valid'], FILTER_VALIDATE_BOOLEAN));
            $this->assertTrue(filter_var($matches[0]['is_ready'], FILTER_VALIDATE_BOOLEAN));
        }

        $assignmentCompositeIndexes = array_values(array_filter(
            $indexes,
            fn (array $index): bool => $index['table_name'] === 'complaint_assignments'
                && str_contains($index['definition'], '(assigned_to, ended_at)')
                && $index['predicate'] === ''
        ));
        $this->assertCount(1, $assignmentCompositeIndexes);
        $this->assertFalse(filter_var($assignmentCompositeIndexes[0]['is_unique'], FILTER_VALIDATE_BOOLEAN));

        $activeAssignmentIndex = array_values(array_filter(
            $indexes,
            fn (array $index): bool => $index['index_name']
                === 'complaint_assignments_one_active_per_complaint_unique'
        ))[0];
        $this->assertTrue(filter_var($activeAssignmentIndex['is_unique'], FILTER_VALIDATE_BOOLEAN));
        $this->assertSame('(ended_at IS NULL)', $activeAssignmentIndex['predicate']);

        $foreignKeys = $pdo->query(<<<'SQL'
            SELECT table_name.relname AS table_name, constraint_info.conname AS constraint_name
            FROM pg_constraint AS constraint_info
            JOIN pg_class AS table_name ON table_name.oid = constraint_info.conrelid
            JOIN pg_namespace AS schema_name ON schema_name.oid = table_name.relnamespace
            WHERE schema_name.nspname = 'public'
              AND constraint_info.contype = 'f'
              AND table_name.relname IN ('complaints', 'complaint_assignments', 'notifications')
        SQL)->fetchAll(PDO::FETCH_ASSOC);

        foreach ([
            'complaints_citizen_id_foreign',
            'complaints_barangay_id_foreign',
            'complaint_assignments_complaint_id_foreign',
            'complaint_assignments_assigned_to_foreign',
            'complaint_assignments_assigned_by_foreign',
            'complaint_assignments_barangay_id_foreign',
            'complaint_assignments_department_id_foreign',
            'notifications_profile_id_foreign',
            'notifications_complaint_id_foreign',
        ] as $requiredForeignKey) {
            $this->assertContains(
                $requiredForeignKey,
                array_column($foreignKeys, 'constraint_name')
            );
        }
    }
}
