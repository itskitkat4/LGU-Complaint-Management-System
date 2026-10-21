<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use Illuminate\Http\Request;

class CitizenProfileController extends Controller
{
    public function showOrCreate(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (! $user || empty($user['id']) || empty($user['email'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::firstOrCreate(
            ['id' => $user['id']],
            [
                'full_name' => $user['user_metadata']['full_name']
                    ?? $user['user_metadata']['name']
                    ?? 'Citizen',
                'email' => $user['email'],
                'role' => 'citizen',
            ]
        );

        // Do not allow an internal staff account to use citizen access.
        if ($profile->role !== 'citizen') {
            return response()->json([
                'message' => 'This account is not registered as a citizen account.',
            ], 403);
        }

        return response()->json([
            'message' => 'Citizen profile retrieved successfully.',
            'profile' => $profile,
            'requires_onboarding' => empty($profile->barangay_id),
        ]);
    }
    public function update(Request $request) {
        $user = $request->attributes->get('supabase_user');


        if (! $user || empty($user['id']) || empty($user['email'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (! $profile) {
            return response()->json([
                'message' => 'Citizen profile not found.',
            ], 404);
        }
        if ($profile->role !== 'citizen') {
            return response()->json([
                'message' => 'This account is not registered as a citizen account.',
            ], 403);
        }
        $validated = $request->validate([
            'barangay_id' => [
                'required',
                'uuid',
                'exists:barangays,id',
            ],
        ]);
        $profile->barangay_id = $validated['barangay_id'];
        $profile->save();

        return response()->json([
            'message' => 'Citizen profile updated successfully.',
            'profile' => $profile,
        ]);
    }
}