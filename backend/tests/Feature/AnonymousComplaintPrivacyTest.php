<?php

namespace Tests\Feature;

use App\Http\Middleware\RedactAnonymousComplaintIdentity;
use App\Models\Complaint;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;
use App\Models\Profile;

class AnonymousComplaintPrivacyTest extends TestCase
{
    private const OWNER = '99999999-9999-4999-8999-999999999999';
    private const COMPLAINT = '88888888-8888-4888-8888-888888888888';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('profiles');
        Schema::dropIfExists('complaints');
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('email');
            $table->string('role');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('citizen_id');
            $table->boolean('is_anonymous')->default(false);
            $table->timestamps();
        });

        Route::get('/api/test/anonymous-complaint', function (Request $request, RedactAnonymousComplaintIdentity $redactor) {
            $profile = Profile::find($request->query('profile_id'));
            $request->attributes->set('profile', $profile);
                return $redactor->handle($request, function () {
                return response()->json([
                    'data' => [
                        'id' => self::COMPLAINT,
                        'citizen_id' => self::OWNER,
                        'is_anonymous' => true,
                        'citizen_name' => 'Private Citizen',
                        'citizen_full_name' => 'Private Citizen',
                        'citizen_email' => 'private@example.com',
                        'citizen' => ['id' => self::OWNER, 'full_name' => 'Private Citizen', 'email' => 'private@example.com'],
                        'citizen_profile' => ['id' => self::OWNER, 'full_name' => 'Private Citizen', 'email' => 'private@example.com'],
                        'complainant' => ['id' => self::OWNER, 'full_name' => 'Private Citizen', 'email' => 'private@example.com'],
                        'complainant_profile' => ['id' => self::OWNER, 'full_name' => 'Private Citizen', 'email' => 'private@example.com'],
                        'metadata' => ['profile' => ['id' => self::OWNER, 'full_name' => 'Private Citizen', 'email' => 'private@example.com']],
                        'attachments' => [[
                            'id' => '77777777-7777-4777-8777-777777777777',
                            'complaint_id' => self::COMPLAINT,
                            'uploaded_by' => self::OWNER,
                            'file_name' => 'private-name-photo.jpg',
                            'mime_type' => 'image/jpeg',
                        ], [
                            'id' => '77777777-7777-4777-8777-777777777778',
                            'resolution_id' => '77777777-7777-4777-8777-777777777779',
                            'uploaded_by' => self::OWNER,
                            'file_name' => 'private-name-resolution.pdf',
                            'mime_type' => 'application/pdf',
                        ]],
                    ],
                ]);
            });
        });
    }

    public function test_identity_is_redacted_for_all_personnel_roles_and_retained_for_admin_and_owner(): void
    {
        $roles = [
            'System Administrator',
            'LGU-Staff',
            'Barangay_Head',
            'Department_Head',
            'Department_Personnel',
            'citizen',
        ];

        foreach ($roles as $index => $role) {
            $id = $role === 'citizen'
                ? self::OWNER
                : sprintf('00000000-0000-4000-8000-%012d', $index + 1);

            \Illuminate\Support\Facades\DB::table('profiles')->insert([
                'id' => $id,
                'full_name' => $role,
                'email' => $id . '@example.com',
                'role' => $role,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $response = $this->getJson('/api/test/anonymous-complaint?profile_id=' . $id)->assertOk();

            if (in_array($role, ['System Administrator', 'citizen'], true)) {
                $response->assertJsonPath('data.citizen_id', self::OWNER)
                    ->assertJsonPath('data.citizen.full_name', 'Private Citizen')
                    ->assertJsonPath('data.citizen_name', 'Private Citizen')
                    ->assertJsonPath('data.citizen_full_name', 'Private Citizen')
                    ->assertJsonPath('data.citizen_email', 'private@example.com')
                    ->assertJsonPath('data.complainant.full_name', 'Private Citizen')
                    ->assertJsonPath('data.citizen_profile.email', 'private@example.com')
                    ->assertJsonPath('data.complainant_profile.email', 'private@example.com')
                    ->assertJsonPath('data.attachments.0.file_name', 'private-name-photo.jpg')
                    ->assertJsonPath('data.attachments.0.uploaded_by', self::OWNER)
                    ->assertJsonPath('data.attachments.1.file_name', 'private-name-resolution.pdf')
                    ->assertJsonPath('data.attachments.1.uploaded_by', self::OWNER);
            } else {
                $data = $response->json('data');
                $this->assertArrayNotHasKey('citizen_id', $data, 'Identity leaked to role ' . $role);
                $this->assertArrayNotHasKey('citizen', $data);
                $this->assertArrayNotHasKey('citizen_profile', $data);
                $this->assertArrayNotHasKey('citizen_name', $data);
                $this->assertArrayNotHasKey('citizen_full_name', $data);
                $this->assertArrayNotHasKey('citizen_email', $data);
                $this->assertArrayNotHasKey('complainant', $data);
                $this->assertArrayNotHasKey('complainant_profile', $data);
                $this->assertArrayNotHasKey('profile', $data['metadata']);
                $this->assertStringNotContainsString('Private Citizen', json_encode($data));
                $this->assertStringNotContainsString('private@example.com', json_encode($data));
                $this->assertArrayNotHasKey('uploaded_by', $data['attachments'][0]);
                $this->assertSame('Anonymous evidence', $data['attachments'][0]['file_name']);
                $this->assertArrayNotHasKey('uploaded_by', $data['attachments'][1]);
                $this->assertSame('Anonymous evidence', $data['attachments'][1]['file_name']);
            }
        }
    }

    public function test_non_anonymous_complaint_identity_and_metadata_are_unchanged(): void
    {
        $id = '66666666-6666-4666-8666-666666666666';
        \Illuminate\Support\Facades\DB::table('profiles')->insert([
            'id' => $id,
            'full_name' => 'LGU Staff',
            'email' => $id . '@example.com',
            'role' => 'LGU-Staff',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Route::get('/api/test/non-anonymous-complaint', function (Request $request, RedactAnonymousComplaintIdentity $redactor) {
            $profile = Profile::find($request->query('profile_id'));
            $request->attributes->set('profile', $profile);
            return $redactor->handle($request, function () {
                return response()->json(['data' => [
                    'id' => self::COMPLAINT,
                    'citizen_id' => self::OWNER,
                    'is_anonymous' => false,
                    'attachments' => [[
                        'complaint_id' => self::COMPLAINT,
                        'uploaded_by' => self::OWNER,
                        'file_name' => 'evidence.jpg',
                    ]],
                ]]);
            });
        });

        $this->getJson('/api/test/non-anonymous-complaint?profile_id=' . $id)
            ->assertOk()
            ->assertJsonPath('data.citizen_id', self::OWNER)
            ->assertJsonPath('data.attachments.0.file_name', 'evidence.jpg');
    }

    public function test_anonymity_cannot_be_changed_after_complaint_creation(): void
    {
        \Illuminate\Support\Facades\DB::table('complaints')->insert([
            'id' => self::COMPLAINT,
            'citizen_id' => self::OWNER,
            'is_anonymous' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $complaint = Complaint::findOrFail(self::COMPLAINT);
        $complaint->is_anonymous = false;

        $this->expectException(\LogicException::class);
        $complaint->save();
    }
}
