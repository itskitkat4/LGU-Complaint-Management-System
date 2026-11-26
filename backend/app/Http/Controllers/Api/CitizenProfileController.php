<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Services\SupabaseAdminService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class CitizenProfileController extends Controller
{
    public function showOrCreate(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (
            !is_array($user)
            || !is_string($user['id'] ?? null)
            || trim($user['id']) === ''
            || !is_string($user['email'] ?? null)
            || trim($user['email']) === ''
        ) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $appMetadata = is_array($user['app_metadata'] ?? null)
            ? $user['app_metadata']
            : [];
        if (($appMetadata[SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY] ?? null) === false) {
            return response()->json([
                'message' => 'Personnel password setup must be completed before profile provisioning.',
            ], 403);
        }

        $profile = Profile::find($user['id']);
        if (!$profile) {
            $claims = $request->attributes->get('supabase_auth_claims');
            $amrMethods = $request->attributes->get('supabase_amr_methods');
            $hasGoogleOAuthSession = is_array($claims)
                && ($claims['sub'] ?? null) === $user['id']
                && is_array($amrMethods)
                && in_array('oauth', $amrMethods, true)
                && !in_array('password', $amrMethods, true);

            if (!$hasGoogleOAuthSession || !$this->hasGoogleIdentity($user, $appMetadata)) {
                return response()->json([
                    'message' => 'A Google-authenticated account is required to create a citizen profile.',
                ], 403);
            }

            $userMetadata = is_array($user['user_metadata'] ?? null)
                ? $user['user_metadata']
                : [];
            try {
                $profile = Profile::create([
                    'id' => $user['id'],
                    'full_name' => $userMetadata['full_name']
                        ?? $userMetadata['name']
                        ?? 'Citizen',
                    'email' => $user['email'],
                    'role' => 'citizen',
                ]);
            } catch (QueryException $exception) {
                if (!$this->isDuplicateProfileEmailViolation($exception)) {
                    throw $exception;
                }

                return response()->json([
                    'message' => 'This email address is already associated with an existing profile.',
                ], 409);
            }
        }

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

    private function isDuplicateProfileEmailViolation(QueryException $exception): bool
    {
        if ((string) $exception->getCode() !== '23505') {
            return false;
        }

        $databaseMessage = $exception->getPrevious()?->getMessage()
            ?? $exception->getMessage();

        return preg_match(
            '/unique constraint\s+"profiles_email_unique"(?:\s|$)/i',
            $databaseMessage
        ) === 1;
    }

    private function hasGoogleIdentity(array $user, array $appMetadata): bool
    {
        if (($appMetadata['provider'] ?? null) === 'google') {
            return true;
        }

        $providers = $appMetadata['providers'] ?? [];
        if (is_array($providers) && in_array('google', $providers, true)) {
            return true;
        }

        $identities = $user['identities'] ?? [];
        if (!is_array($identities)) {
            return false;
        }

        foreach ($identities as $identity) {
            if (is_array($identity) && ($identity['provider'] ?? null) === 'google') {
                return true;
            }
        }

        return false;
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