<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Services\SupabaseAdminService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdminComplaintControllerTest extends TestCase
{
    private const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
    private const CITIZEN_ID = '22222222-2222-4222-8222-222222222222';
    private const ANONYMOUS_COMPLAINT_ID = '33333333-3333-4333-8333-333333333333';
    private const REGULAR_COMPLAINT_ID = '44444444-4444-4444-8444-444444444444';
    private const CATEGORY_ID = '55555555-5555-4555-8555-555555555555';
    private const BARANGAY_ID = '66666666-6666-4666-8666-666666666666';
    private const ATTACHMENT_ID = '77777777-7777-4777-8777-777777777777';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.supabase.url' => 'https://example.supabase.co',
            'services.supabase.publishable_key' => 'test-publishable-key',
        ]);

        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('complaint_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
        });
        Schema::create('barangays', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
        });
        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id');
            $table->uuid('category_id');
            $table->uuid('barangay_id');
            $table->string('title');
            $table->text('description');
            $table->string('priority');
            $table->string('status');
            $table->boolean('is_anonymous')->default(false);
            $table->string('resolution_level')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });
        Schema::create('complaint_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('complaint_id');
            $table->uuid('uploaded_by');
            $table->string('file_path');
            $table->string('file_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size');
        });

        DB::table('profiles')->insert([
            [
                'id' => self::ADMIN_ID,
                'full_name' => 'Test Administrator',
                'email' => 'admin@example.com',
                'role' => 'System Administrator',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => self::CITIZEN_ID,
                'full_name' => 'Private Citizen Name',
                'email' => 'citizen-private@example.com',
                'role' => 'citizen',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
        DB::table('complaint_categories')->insert([
            'id' => self::CATEGORY_ID,
            'name' => 'Roads',
        ]);
        DB::table('barangays')->insert([
            'id' => self::BARANGAY_ID,
            'name' => 'North Barangay',
        ]);

        $this->createComplaint(self::ANONYMOUS_COMPLAINT_ID, true);
        $this->createComplaint(self::REGULAR_COMPLAINT_ID, false);
        DB::table('complaint_attachments')->insert([
            'id' => self::ATTACHMENT_ID,
            'complaint_id' => self::ANONYMOUS_COMPLAINT_ID,
            'uploaded_by' => self::CITIZEN_ID,
            'file_path' => 'private/evidence.jpg',
            'file_name' => 'citizen-name-evidence.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
        ]);

        Http::fake([
            '*' => Http::response([
                'id' => self::ADMIN_ID,
                'email' => 'admin@example.com',
                'app_metadata' => [
                    SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY => true,
                ],
            ], 200),
        ]);
    }

    public function test_index_preserves_anonymous_and_non_anonymous_citizen_identity_for_admins(): void
    {
        $response = $this->asAdmin()->getJson('/api/admin/complaints')->assertOk();
        $complaints = collect($response->json('data'))->keyBy('id');
        $anonymous = $complaints->get(self::ANONYMOUS_COMPLAINT_ID);
        $regular = $complaints->get(self::REGULAR_COMPLAINT_ID);

        $this->assertNotNull($anonymous);
        $this->assertTrue($anonymous['is_anonymous']);
        $this->assertSame(self::CITIZEN_ID, $anonymous['citizen_id']);
        $this->assertSame('Private Citizen Name', $anonymous['citizen']['full_name']);
        $this->assertSame('citizen-private@example.com', $anonymous['citizen']['email']);

        $this->assertFalse($regular['is_anonymous']);
        $this->assertSame(self::CITIZEN_ID, $regular['citizen_id']);
        $this->assertSame('Private Citizen Name', $regular['citizen']['full_name']);
        $this->assertSame('citizen-private@example.com', $regular['citizen']['email']);
    }

    public function test_show_preserves_anonymous_identity_evidence_and_database_ownership_for_admins(): void
    {
        $response = $this->asAdmin()
            ->getJson('/api/admin/complaints/' . self::ANONYMOUS_COMPLAINT_ID)
            ->assertOk()
            ->assertJsonPath('data.id', self::ANONYMOUS_COMPLAINT_ID)
            ->assertJsonPath('data.citizen_id', self::CITIZEN_ID)
            ->assertJsonPath('data.citizen.full_name', 'Private Citizen Name')
            ->assertJsonPath('data.citizen.email', 'citizen-private@example.com')
            ->assertJsonPath('data.attachments.0.uploaded_by', self::CITIZEN_ID)
            ->assertJsonPath('data.attachments.0.file_name', 'citizen-name-evidence.jpg');

        $this->assertTrue($response->json('data.is_anonymous'));
        $this->assertSame(self::CITIZEN_ID, Complaint::findOrFail(self::ANONYMOUS_COMPLAINT_ID)->citizen_id);

        $this->asAdmin()
            ->getJson('/api/admin/complaints/' . self::REGULAR_COMPLAINT_ID)
            ->assertOk()
            ->assertJsonPath('data.citizen_id', self::CITIZEN_ID)
            ->assertJsonPath('data.citizen.full_name', 'Private Citizen Name')
            ->assertJsonPath('data.citizen.email', 'citizen-private@example.com');
    }

    private function createComplaint(string $id, bool $isAnonymous): void
    {
        DB::table('complaints')->insert([
            'id' => $id,
            'citizen_id' => self::CITIZEN_ID,
            'category_id' => self::CATEGORY_ID,
            'barangay_id' => self::BARANGAY_ID,
            'title' => 'Complaint ' . $id,
            'description' => 'Complaint details remain available for administration.',
            'priority' => 'medium',
            'status' => 'submitted',
            'is_anonymous' => $isAnonymous,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function asAdmin()
    {
        return $this->withToken($this->syntheticSupabaseToken(self::ADMIN_ID, ['password']));
    }
}
