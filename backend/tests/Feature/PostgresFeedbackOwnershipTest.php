<?php

namespace Tests\Feature;

use PDO;
use PDOException;
use Tests\TestCase;

class PostgresFeedbackOwnershipTest extends TestCase
{
    public function test_postgres_enforces_feedback_ownership_and_preserves_existing_relations(): void
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

        $uniqueConstraints = $pdo->query(<<<'SQL'
            SELECT pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'public.complaints'::regclass
              AND conname = 'complaints_id_citizen_id_unique'
              AND contype = 'u'
        SQL)->fetchAll(PDO::FETCH_COLUMN);
        $this->assertCount(1, $uniqueConstraints);
        $this->assertStringContainsString('UNIQUE (id, citizen_id)', $uniqueConstraints[0]);

        $ownerForeignKey = $pdo->query(<<<'SQL'
            SELECT pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'public.feedback'::regclass
              AND conname = 'feedback_complaint_citizen_owner_foreign'
              AND contype = 'f'
        SQL)->fetchColumn();
        $this->assertNotFalse($ownerForeignKey);
        $this->assertStringContainsString('FOREIGN KEY (complaint_id, citizen_id)', $ownerForeignKey);
        $this->assertStringContainsString('ON DELETE CASCADE', $ownerForeignKey);

        $feedbackForeignKeys = $pdo->query(<<<'SQL'
            SELECT conname, pg_get_constraintdef(oid) AS definition
            FROM pg_constraint
            WHERE conrelid = 'public.feedback'::regclass AND contype = 'f'
        SQL)->fetchAll(PDO::FETCH_KEY_PAIR);
        $this->assertStringContainsString('ON DELETE CASCADE', $feedbackForeignKeys['feedback_complaint_id_foreign']);
        $this->assertStringContainsString('ON DELETE RESTRICT', $feedbackForeignKeys['feedback_citizen_id_foreign']);

        $pdo->beginTransaction();
        try {
            $citizenA = $this->uuid();
            $citizenB = $this->uuid();
            $complaintA = $this->uuid();
            $categoryId = $this->uuid();
            $barangayId = $this->uuid();
            $this->insertProfile($pdo, $citizenA);
            $this->insertProfile($pdo, $citizenB);
            $pdo->prepare('INSERT INTO complaint_categories (id, name) VALUES (?, ?)')->execute([
                $categoryId,
                'Finding 28 ' . $categoryId,
            ]);
            $pdo->prepare('INSERT INTO barangays (id, name) VALUES (?, ?)')->execute([
                $barangayId,
                'Finding 28 ' . $barangayId,
            ]);
            $this->insertComplaint($pdo, $complaintA, $citizenA, $categoryId, $barangayId);
            $unreviewedComplaint = $this->uuid();
            $this->insertComplaint($pdo, $unreviewedComplaint, $citizenA, $categoryId, $barangayId);

            $feedbackId = $this->uuid();
            $this->insertFeedback($pdo, $feedbackId, $complaintA, $citizenA);
            $this->assertSame(
                $feedbackId,
                $pdo->query('SELECT id FROM feedback WHERE complaint_id = ' . $pdo->quote($complaintA))
                    ->fetchColumn()
            );

            $this->assertRejectedWrite($pdo, fn () => $this->insertFeedback(
                $pdo,
                $this->uuid(),
                $unreviewedComplaint,
                $citizenB
            ), '23503');

            $this->assertRejectedWrite($pdo, fn () => $this->insertFeedback(
                $pdo,
                $this->uuid(),
                $this->uuid(),
                $citizenA
            ), '23503');

            $this->assertRejectedWrite($pdo, fn () => $this->insertFeedback(
                $pdo,
                $this->uuid(),
                $unreviewedComplaint,
                $this->uuid()
            ), '23503');

            $this->assertRejectedWrite($pdo, fn () => $this->insertFeedback(
                $pdo,
                $this->uuid(),
                $complaintA,
                $citizenA
            ), '23505');

            $this->assertRejectedWrite($pdo, function () use ($pdo, $unreviewedComplaint): void {
                $pdo->prepare(<<<'SQL'
                    INSERT INTO feedback (id, complaint_id, citizen_id, rating)
                    VALUES (?, NULL, ?, 5)
                SQL)->execute([$this->uuid(), $this->uuid()]);
            }, '23502');

            $this->assertRejectedWrite($pdo, function () use ($pdo, $unreviewedComplaint): void {
                $pdo->prepare(<<<'SQL'
                    INSERT INTO feedback (id, complaint_id, citizen_id, rating)
                    VALUES (?, ?, NULL, 5)
                SQL)->execute([$this->uuid(), $unreviewedComplaint]);
            }, '23502');

            $this->assertRejectedWrite($pdo, function () use ($pdo, $complaintA, $citizenB): void {
                $pdo->prepare('UPDATE complaints SET citizen_id = ? WHERE id = ?')->execute([
                    $citizenB,
                    $complaintA,
                ]);
            }, '23503');

            $secondComplaint = $this->uuid();
            $this->insertComplaint($pdo, $secondComplaint, $citizenA, $categoryId, $barangayId);
            $this->insertFeedback($pdo, $this->uuid(), $secondComplaint, $citizenA);
            $pdo->prepare('DELETE FROM complaints WHERE id = ?')->execute([$secondComplaint]);
            $this->assertSame(0, (int) $pdo->query(
                'SELECT COUNT(*) FROM feedback WHERE complaint_id = ' . $pdo->quote($secondComplaint)
            )->fetchColumn());
        } finally {
            $pdo->rollBack();
        }
    }

    private function insertProfile(PDO $pdo, string $id): void
    {
        $pdo->prepare('INSERT INTO profiles (id, full_name, email, role) VALUES (?, ?, ?, ?)')->execute([
            $id,
            'Finding 28 Citizen',
            $id . '@example.test',
            'Citizen',
        ]);
    }

    private function insertComplaint(PDO $pdo, string $id, string $citizenId, string $categoryId, string $barangayId): void
    {
        $pdo->prepare(<<<'SQL'
            INSERT INTO complaints
                (id, citizen_id, category_id, barangay_id, title, description, status)
            VALUES (?, ?, ?, ?, 'Finding 28 complaint', 'Ownership constraint integration check', 'resolved')
        SQL)->execute([$id, $citizenId, $categoryId, $barangayId]);
    }

    private function insertFeedback(PDO $pdo, string $id, string $complaintId, string $citizenId): void
    {
        $pdo->prepare(<<<'SQL'
            INSERT INTO feedback (id, complaint_id, citizen_id, rating, comment)
            VALUES (?, ?, ?, 5, 'Direct PostgreSQL ownership check')
        SQL)->execute([$id, $complaintId, $citizenId]);
    }

    private function assertRejectedWrite(PDO $pdo, callable $write, string $sqlState): void
    {
        $pdo->exec('SAVEPOINT finding28_invalid_write');
        try {
            $write();
            $this->fail('PostgreSQL accepted a feedback row that should be rejected.');
        } catch (PDOException $exception) {
            $this->assertSame($sqlState, $exception->getCode());
        } finally {
            $pdo->exec('ROLLBACK TO SAVEPOINT finding28_invalid_write');
            $pdo->exec('RELEASE SAVEPOINT finding28_invalid_write');
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
