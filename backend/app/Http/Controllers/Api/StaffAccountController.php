<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Services\SupabaseAdminService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\QueryException;
use Illuminate\Validation\Rule;
use Throwable;

class StaffAccountController extends Controller
{

    public function index()
    {
        $staff = Profile::whereIn('role', [
            'Barangay_Head',
            'LGU-Staff',
            'Department_Head',
            'Department_Personnel',
        ])
            ->orderBy('full_name')
            ->get([
                'id',
                'full_name',
                'email',
                'role',
                'barangay_id',
                'department_id',
                'is_active',
                'created_at',
            ]);

        return response()->json([
            'message' => 'Staff accounts retrieved successfully.',
            'staff' => $staff,
        ], 200);
    }
    public function store(
        Request $request,
        SupabaseAdminService $supabase
    ) {
        $validator = Validator::make($request->all(), [
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'role' => [
                'required',
                Rule::in([
                    'Barangay_Head',
                    'LGU-Staff',
                    'Department_Head',
                    'Department_Personnel',
                ]),
            ],
            'barangay_id' => ['nullable', 'uuid', 'exists:barangays,id'],
            'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        if (
            $data['role'] === 'Barangay_Head'
            && empty($data['barangay_id'])
        ) {
            return response()->json([
                'message' => 'Barangay Head requires a barangay assignment.',
            ], 422);
        }

        if (
            in_array($data['role'], [
                'Department_Head',
                'Department_Personnel',
            ], true)
            && empty($data['department_id'])
        ) {
            return response()->json([
                'message' => 'This role requires a department assignment.',
            ], 422);
        }

        if (
            $data['role'] === 'Department_Head'
            && Profile::where('role', 'Department_Head')
                ->where('department_id', $data['department_id'])
                ->where('is_active', true)
                ->exists()
        ) {
            return response()->json([
                'message' => 'This department already has an active Department Head.',
            ], 409);
        }

        if (Profile::where('email', $data['email'])->exists()) {
            return response()->json([
                'message' => 'An account with this email already exists.',
            ], 409);
        }

        $authUserId = null;

        try {
            //* Create the Staff Account in Supabase Auth
            $authUser = $supabase->inviteUser(
                $data['email'],
                ['full_name' => $data['full_name']]
            );

            if (empty($authUser['id'])) {
                throw new \RuntimeException(
                    'Supabase did not return a user ID.'
                );
            }

            $authUserId = $authUser['id'];

            //*Save the staff profile in our database
            $profile = DB::transaction(function () use ($data, $authUser) {
                return Profile::create([
                    'id' => $authUser['id'],
                    'full_name' => $data['full_name'],
                    'email' => $data['email'],
                    'role' => $data['role'],
                    'barangay_id' => $data['barangay_id'] ?? null,
                    'department_id' => $data['department_id'] ?? null,
                    'is_active' => true,
                ]);
            });

            return response()->json([
                'message' => 'Staff invitation sent successfully.',
                'profile' => $profile,
            ], 201);

        } catch (Throwable $e) {

            //* Remove the Auth user if profile creation failed
            if ($authUserId !== null) {
                try {
                    $supabase->deleteUser($authUserId);
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }

            if (
                $e instanceof QueryException
                && str_contains($e->getMessage(), 'profiles_one_active_department_head_per_department_unique')
            ) {
                return response()->json([
                    'message' => 'This department already has an active Department Head.',
                ], 409);
            }

            report($e);

            return response()->json([
                'message' => 'Unable to create staff account.',
            ], 500);
        }
    }
    public function deactivate(string $staffId)
    {
        //* Find staff profile by ID

        $staff = Profile::find($staffId);

        if (!$staff) {
            return response()->json([
                'message' => 'Staff profile not found.',
            ], 404);
        }
        if (
            in_array($staff->role, [
                'citizen',
                'System Administrator',
            ], true)
        ) {
            return response()->json([
                'message' => 'This account cannot be deactivated through staff management.',
            ], 403);
        }
        // Check if the account is already inactive
        if (!$staff->is_active) {
            return response()->json([
                'message' => 'This staff account is already deactivated.',
            ], 200);
        }

        // Deactivate the staff account
        $staff->is_active = false;
        $staff->save();

        return response()->json([
            'message' => 'Staff account deactivated successfully.',
            'profile' => $staff,
        ], 200);
    }

}
