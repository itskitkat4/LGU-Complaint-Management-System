<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ComplaintStatusConstraintsMigrationTest extends TestCase
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

    protected function setUp(): void
    {
        parent::setUp();

        $this->assertSame('sqlite', DB::getDriverName());

        Schema::create('complaints', function (Blueprint $table) {
            $table->increments('id');
            $table->string('status');
            $table->text('rejection_reason')->nullable();
        });

        Schema::create('complaint_updates', function (Blueprint $table) {
            $table->increments('id');
            $table->string('new_status');
            $table->string('old_status')->nullable();
        });

        Schema::create('complaint_resolutions', function (Blueprint $table) {
            $table->increments('id');
            $table->string('review_status')->default('pending_review');
        });

        $migration = require database_path(
            'migrations/2026_10_19_153618_update_complaint_status_constraints.php'
        );
        $migration->up();
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('complaint_updates');
        Schema::dropIfExists('complaint_resolutions');
        Schema::dropIfExists('complaints');

        parent::tearDown();
    }

    public function test_approved_complaint_and_update_statuses_are_accepted(): void
    {
        foreach (self::APPROVED_STATUSES as $status) {
            DB::table('complaints')->insert([
                'status' => $status,
                'rejection_reason' => $status === 'declined' ? 'Not eligible' : null,
            ]);
            DB::table('complaint_updates')->insert([
                'new_status' => $status,
                'old_status' => null,
            ]);
        }

        DB::table('complaint_resolutions')->insert(['review_status' => 'pending_review']);

        $this->assertSame(count(self::APPROVED_STATUSES), DB::table('complaints')->count());
        $this->assertSame(count(self::APPROVED_STATUSES), DB::table('complaint_updates')->count());
        $this->assertDatabaseHas('complaint_resolutions', ['review_status' => 'pending_review']);
    }

    public function test_pending_review_is_rejected_as_a_complaint_or_update_status(): void
    {
        foreach ([
            fn () => DB::table('complaints')->insert(['status' => 'pending_review']),
            fn () => DB::table('complaint_updates')->insert(['new_status' => 'pending_review']),
            fn () => DB::table('complaint_updates')->insert([
                'new_status' => 'submitted',
                'old_status' => 'pending_review',
            ]),
        ] as $invalidWrite) {
            try {
                $invalidWrite();
                $this->fail('The SQLite status trigger accepted pending_review.');
            } catch (QueryException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_sqlite_triggers_preserve_rejection_and_update_constraints(): void
    {
        foreach ([
            fn () => DB::table('complaints')->insert(['status' => 'declined']),
            fn () => DB::table('complaints')->insert([
                'status' => 'declined',
                'rejection_reason' => '   ',
            ]),
            fn () => DB::table('complaint_updates')->insert([
                'new_status' => 'submitted',
                'old_status' => 'unknown',
            ]),
        ] as $invalidWrite) {
            try {
                $invalidWrite();
                $this->fail('A SQLite status trigger accepted an invalid row.');
            } catch (QueryException) {
                $this->addToAssertionCount(1);
            }
        }

        DB::table('complaints')->insert(['status' => 'submitted']);
        try {
            DB::table('complaints')->where('id', 1)->update(['status' => 'pending_review']);
            $this->fail('The SQLite status trigger accepted an invalid update.');
        } catch (QueryException) {
            $this->addToAssertionCount(1);
        }

        DB::table('complaint_updates')->insert([
            'new_status' => 'submitted',
            'old_status' => null,
        ]);
        try {
            DB::table('complaint_updates')->where('id', 1)->update([
                'new_status' => 'pending_review',
            ]);
            $this->fail('The SQLite update trigger accepted an invalid complaint update.');
        } catch (QueryException) {
            $this->addToAssertionCount(1);
        }
    }

    public function test_down_remains_sqlite_compatible_and_keeps_approved_statuses_enforced(): void
    {
        $migration = require database_path(
            'migrations/2026_10_19_153618_update_complaint_status_constraints.php'
        );
        $migration->down();

        DB::table('complaints')->insert(['status' => 'resolved']);
        try {
            DB::table('complaints')->insert(['status' => 'pending_review']);
            $this->fail('The SQLite down path weakened the approved status constraint.');
        } catch (QueryException) {
            $this->addToAssertionCount(1);
        }
    }

    public function test_following_canonical_status_migrations_support_up_and_down_in_order(): void
    {
        $migrationFiles = [
            '2026_11_03_164551_restore_canonical_complaint_status_constraints.php',
            '2026_11_08_000000_align_complaint_status_constraints.php',
            '2026_11_09_000002_canonicalize_complaint_statuses.php',
            '2026_11_11_000001_remove_pending_review_from_complaint_status_constraints.php',
        ];

        foreach ($migrationFiles as $index => $file) {
            $migration = require database_path('migrations/' . $file);
            $migration->up();

            DB::table('complaints')->insert([
                'status' => self::APPROVED_STATUSES[$index],
                'rejection_reason' => self::APPROVED_STATUSES[$index] === 'declined'
                    ? 'Not eligible'
                    : null,
            ]);
            DB::table('complaint_updates')->insert([
                'new_status' => self::APPROVED_STATUSES[$index],
                'old_status' => null,
            ]);
            DB::table('complaint_resolutions')->insert(['review_status' => 'pending_review']);

            $this->assertRejected(
                fn () => DB::table('complaints')->insert(['status' => 'pending_review'])
            );
            $this->assertRejected(
                fn () => DB::table('complaint_updates')->insert(['new_status' => 'pending_review'])
            );
        }

        foreach (array_reverse($migrationFiles) as $file) {
            $migration = require database_path('migrations/' . $file);
            $migration->down();

            DB::table('complaints')->insert(['status' => 'resolved']);
            DB::table('complaint_updates')->insert([
                'new_status' => 'resolved',
                'old_status' => null,
            ]);
            $this->assertRejected(
                fn () => DB::table('complaints')->insert(['status' => 'pending_review'])
            );
            $this->assertRejected(
                fn () => DB::table('complaint_updates')->insert(['new_status' => 'pending_review'])
            );
        }

        $this->assertSame(
            count($migrationFiles),
            DB::table('complaint_resolutions')->where('review_status', 'pending_review')->count()
        );
    }

    private function assertRejected(callable $write): void
    {
        try {
            $write();
            $this->fail('A SQLite status trigger accepted an invalid status.');
        } catch (QueryException) {
            $this->addToAssertionCount(1);
        }
    }
}
