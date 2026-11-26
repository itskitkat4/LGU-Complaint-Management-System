<?php

namespace Tests\Feature;

use PDO;
use PDOException;
use Tests\TestCase;

class PostgresComplaintStatusConstraintsTest extends TestCase
{
    private const APPROVED_STATUSES = [
        'submitted',
        'under_review',
        'accepted',
        'declined',
        'assigned',
        'in_progress',
        'resolved',
    ];

    public function test_migrated_postgres_schema_enforces_the_approved_complaint_statuses(): void
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

        $constraints = $pdo->query(<<<'SQL'
            SELECT convalidated, pg_get_constraintdef(oid) AS definition
            FROM pg_constraint
            WHERE conrelid = 'public.complaints'::regclass
              AND conname = 'complaints_status_check'
              AND contype = 'c'
        SQL)->fetchAll(PDO::FETCH_ASSOC);

        $this->assertCount(1, $constraints);
        $this->assertTrue(filter_var($constraints[0]['convalidated'], FILTER_VALIDATE_BOOLEAN));
        foreach (self::APPROVED_STATUSES as $status) {
            $this->assertStringContainsString($status, $constraints[0]['definition']);
        }
        $this->assertStringNotContainsString('pending_review', $constraints[0]['definition']);

        $statusIsNotNull = $pdo->query(<<<'SQL'
            SELECT attnotnull
            FROM pg_attribute
            WHERE attrelid = 'public.complaints'::regclass
              AND attname = 'status'
              AND NOT attisdropped
        SQL)->fetchColumn();
        $this->assertTrue(filter_var($statusIsNotNull, FILTER_VALIDATE_BOOLEAN));

        $complaintChecks = $pdo->query(<<<'SQL'
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'public.complaints'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) ILIKE '%status%'
            ORDER BY conname
        SQL)->fetchAll(PDO::FETCH_COLUMN);
        $this->assertSame([
            'complaints_rejection_reason_check',
            'complaints_status_check',
        ], $complaintChecks);

        $complaintForeignKeys = $pdo->query(<<<'SQL'
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'public.complaints'::regclass AND contype = 'f'
            ORDER BY conname
        SQL)->fetchAll(PDO::FETCH_COLUMN);
        $this->assertSame([
            'complaints_barangay_id_foreign',
            'complaints_category_id_foreign',
            'complaints_citizen_id_foreign',
        ], $complaintForeignKeys);

        $complaintIndexes = $pdo->query(<<<'SQL'
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public' AND tablename = 'complaints'
        SQL)->fetchAll(PDO::FETCH_COLUMN);
        foreach ([
            'complaints_pkey',
            'complaints_citizen_id_index',
            'complaints_category_id_index',
            'complaints_barangay_id_index',
            'complaints_status_index',
            'complaints_created_at_index',
        ] as $requiredIndex) {
            $this->assertContains($requiredIndex, $complaintIndexes);
        }

        $reviewConstraint = $pdo->query(<<<'SQL'
            SELECT pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'public.complaint_resolutions'::regclass
              AND conname = 'complaint_resolutions_review_status_check'
        SQL)->fetchColumn();
        $this->assertStringContainsString('pending_review', $reviewConstraint);

        $escalationStatusConstraint = $pdo->query(<<<'SQL'
            SELECT pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'public.complaint_escalations'::regclass
              AND conname = 'complaint_escalations_status_check'
        SQL)->fetchColumn();
        foreach (['pending', 'accepted', 'redirected', 'completed'] as $escalationStatus) {
            $this->assertStringContainsString($escalationStatus, $escalationStatusConstraint);
        }

        $pdo->beginTransaction();
        try {
            $barangayId = $this->uuid();
            $profileId = $this->uuid();
            $categoryId = $this->uuid();
            $pdo->prepare('INSERT INTO barangays (id, name) VALUES (?, ?)')->execute([
                $barangayId,
                'Finding 27 ' . $barangayId,
            ]);
            $pdo->prepare('INSERT INTO profiles (id, full_name, email, role) VALUES (?, ?, ?, ?)')->execute([
                $profileId,
                'Finding 27 Test Citizen',
                $profileId . '@example.test',
                'Citizen',
            ]);
            $pdo->prepare('INSERT INTO complaint_categories (id, name) VALUES (?, ?)')->execute([
                $categoryId,
                'Finding 27 ' . $categoryId,
            ]);

            foreach (self::APPROVED_STATUSES as $status) {
                $complaintId = $this->uuid();
                $pdo->prepare(<<<'SQL'
                    INSERT INTO complaints
                        (id, citizen_id, category_id, barangay_id, title, description, status, rejection_reason)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                SQL)->execute([
                    $complaintId,
                    $profileId,
                    $categoryId,
                    $barangayId,
                    'Finding 27 ' . $status,
                    'PostgreSQL constraint integration check',
                    $status,
                    $status === 'declined' ? 'Valid test reason' : null,
                ]);

                $pdo->prepare(<<<'SQL'
                    INSERT INTO complaint_updates (id, complaint_id, updated_by, old_status, new_status)
                    VALUES (?, ?, ?, NULL, ?)
                SQL)->execute([$this->uuid(), $complaintId, $profileId, $status]);
            }

            foreach (['pending_review', 'Submitted', 'rejected', 'closed', 'transferred', 'unknown'] as $invalidStatus) {
                $this->assertRejectedWrite($pdo, function () use (
                    $pdo,
                    $profileId,
                    $categoryId,
                    $barangayId,
                    $invalidStatus
                ): void {
                    $pdo->prepare(<<<'SQL'
                        INSERT INTO complaints
                            (id, citizen_id, category_id, barangay_id, title, description, status)
                        VALUES (?, ?, ?, ?, 'Invalid status', 'Must fail', ?)
                    SQL)->execute([
                        $this->uuid(),
                        $profileId,
                        $categoryId,
                        $barangayId,
                        $invalidStatus,
                    ]);
                }, '23514');
            }

            $this->assertRejectedWrite($pdo, function () use ($pdo, $profileId, $categoryId, $barangayId): void {
                $pdo->prepare(<<<'SQL'
                    INSERT INTO complaints
                        (id, citizen_id, category_id, barangay_id, title, description, status)
                    VALUES (?, ?, ?, ?, 'Null status', 'Must fail', NULL)
                SQL)->execute([$this->uuid(), $profileId, $categoryId, $barangayId]);
            }, '23502');
        } finally {
            $pdo->rollBack();
        }
    }

    private function assertRejectedWrite(PDO $pdo, callable $write, string $sqlState): void
    {
        $pdo->exec('SAVEPOINT finding27_invalid_write');
        try {
            $write();
            $this->fail('PostgreSQL accepted a complaint status that should be rejected.');
        } catch (PDOException $exception) {
            $this->assertSame($sqlState, $exception->getCode());
        } finally {
            $pdo->exec('ROLLBACK TO SAVEPOINT finding27_invalid_write');
            $pdo->exec('RELEASE SAVEPOINT finding27_invalid_write');
        }
    }

    private function uuid(): string
    {
        return sprintf(
            '%s-%s-4%s-%04x-%s',
            bin2hex(random_bytes(4)),
            bin2hex(random_bytes(2)),
            substr(bin2hex(random_bytes(2)), 1, 3),
            random_int(0x8000, 0xbfff),
            bin2hex(random_bytes(6))
        );
    }
}
