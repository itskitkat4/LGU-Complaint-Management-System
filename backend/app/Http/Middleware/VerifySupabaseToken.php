<?php
namespace App\Http\Middleware;

use App\Models\Profile;
use App\Services\SupabaseAdminService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Cache;

class VerifySupabaseToken
{
    private const PERSONNEL_AUTH_ROLES = [
        'System Administrator',
        'Barangay_Head',
        'LGU-Staff',
        'Department_Head',
        'Department_Personnel',
    ];

    private const PASSWORD_SETUP_ROLES = [
        'Barangay_Head',
        'LGU-Staff',
        'Department_Head',
        'Department_Personnel',
    ];

   
public function handle(Request $request, Closure $next): Response
{
    $token = $request->bearerToken();

    if (!$token) {
        return response()->json([
            'message' => 'Unauthenticated',
        ], 401);
    }

    // Decode claims before contacting Supabase or using cached data.
    $claims = $this->decodeAccessTokenClaims($token);

    if (
        $claims === null
        || !is_string($claims['sub'] ?? null)
        || $claims['sub'] === ''
        || (!is_int($claims['exp'] ?? null) && !is_float($claims['exp'] ?? null))
        || !is_finite((float) $claims['exp'])
        || $claims['exp'] <= time()
    ) {
        return response()->json([
            'message' => 'Invalid or Expired token.',
        ], 401);
    }

    $url = rtrim(trim((string) config('services.supabase.url')), '/');

    if ($url === '') {
        return response()->json([
            'message' => 'Supabase Authentication is not configured properly.',
        ], 500);
    }

    // Never store the raw access token in the cache key.
    $cacheKey = 'supabase_user:' . hash('sha256', $url . '|' . $token);

    $user = Cache::get($cacheKey);

    // Only accept a properly structured cached user.
    if (
        !is_array($user)
        || !is_string($user['id'] ?? null)
        || $user['id'] === ''
    ) {
        $user = null;
    }

    if ($user === null) {
        $key = config('services.supabase.publishable_key');

        if (!is_string($key) || trim($key) === '') {
            return response()->json([
                'message' => 'Supabase Authentication is not configured properly.',
            ], 500);
        }

        try {
            $response = Http::acceptJson()
                ->withHeaders([
                    'apikey' => $key,
                    'Authorization' => 'Bearer ' . $token,
                ])
                ->timeout(10)
                ->get($url . '/auth/v1/user');
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return response()->json([
                'message' => 'Authentication service is unavailable.',
            ], 503);
        }

        if (!$response->successful()) {
            $upstreamBody = $response->json();
            $errorCode = null;

            if (is_array($upstreamBody)) {
                foreach (['error_code', 'code', 'error'] as $field) {
                    $candidate = $upstreamBody[$field] ?? null;

                    if (
                        is_string($candidate) &&
                        !in_array($candidate, [$token, $key], true) &&
                        preg_match('/\A[a-zA-Z0-9_-]{1,64}\z/', $candidate)
                    ) {
                        $errorCode = $candidate;
                        break;
                    }
                }
            }

            $context = [
                'upstream_status' => $response->status(),
                'error_description' => 'Supabase Auth user verification returned a non-success status.',
            ];

            if ($errorCode !== null) {
                $context['supabase_error_code'] = $errorCode;
            }

            $requestId = $request->header('X-Request-ID')
                ?? $request->header('X-Correlation-ID');

            if (
                is_string($requestId) &&
                preg_match(
                '/\A[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/i',
                $requestId
                )
            ) {
                $context['request_id'] = $requestId;
            }

            Log::warning('Supabase user verification failed.', $context);

            return response()->json([
                'message' => 'Invalid or Expired token.',
            ], 401);
        }

        $user = $response->json();

        if (
            !is_array($user)
            || !is_string($user['id'] ?? null)
            || $user['id'] === ''
            || !hash_equals($user['id'], $claims['sub'])
        ) {
            return response()->json([
                'message' => 'Invalid authentication response from Supabase.',
            ], 401);
        }

        // Cache only successful Supabase verification results.
        Cache::put($cacheKey, $user, now()->addSeconds(30));
    } elseif (!hash_equals($user['id'], $claims['sub'])) {
        return response()->json([
            'message' => 'Invalid authentication token claims.',
        ], 401);
    }

    $amrMethods = $this->validatedAmrMethods($claims['amr'] ?? null);

    if (array_key_exists('amr', $claims) && $amrMethods === null) {
        return response()->json([
            'message' => 'Invalid authentication method claims.',
        ], 401);
    }

    // Check whether the authenticated user has an active profile.
    $profile = Profile::find($user['id']);

    if ($profile && !$profile->is_active) {
        return response()->json([
            'message' => 'Your account has been deactivated. Please cooperate with the System Administrator.',
        ], 403);
    }

    if ($profile && in_array($profile->role, self::PASSWORD_SETUP_ROLES, true)) {
        $appMetadata = is_array($user['app_metadata'] ?? null)
            ? $user['app_metadata']
            : [];

        $setupComplete = $appMetadata[SupabaseAdminService::PASSWORD_SETUP_COMPLETED_KEY] ?? null;
        $isSetupEndpoint = $request->routeIs('staff-accounts.complete-password-setup');

        if (
            ($isSetupEndpoint && $setupComplete !== false)
            || (!$isSetupEndpoint && $setupComplete !== true)
        ) {
            return response()->json([
                'message' => $setupComplete === false
                    ? 'Complete password setup before accessing this resource.'
                    : 'Password setup status is unverified.',
            ], 403);
        }
    }

    if ($profile && in_array($profile->role, self::PERSONNEL_AUTH_ROLES, true)) {
        $isSetupEndpoint = $request->routeIs('staff-accounts.complete-password-setup');

        $hasPasswordMethod = is_array($amrMethods)
            && in_array('password', $amrMethods, true);

        $hasOtpMethod = is_array($amrMethods)
            && in_array('otp', $amrMethods, true);

        $hasOAuthMethod = is_array($amrMethods)
            && in_array('oauth', $amrMethods, true);

        $hasAllowedPersonnelMethod = $isSetupEndpoint
            ? ($hasPasswordMethod || $hasOtpMethod) && !$hasOAuthMethod
            : $hasPasswordMethod && !$hasOAuthMethod;

        if (!$hasAllowedPersonnelMethod) {
            return response()->json([
                'message' => 'Personnel accounts must use an authorized email authentication method.',
            ], 403);
        }
    }

    // Attach authenticated user, claims, methods, and Profile to the request.
    $request->attributes->set('supabase_user', $user);
    $request->attributes->set('supabase_auth_claims', $claims);
    $request->attributes->set('supabase_amr_methods', $amrMethods);
    $request->attributes->set('profile', $profile);

    return $next($request);
}

    private function decodeAccessTokenClaims(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        foreach ($parts as $part) {
            if ($part === '' || !preg_match('/\A[A-Za-z0-9_-]+\z/', $part)) {
                return null;
            }
        }

        $header = $this->decodeJwtJsonObject($parts[0]);
        $payload = $this->decodeJwtJsonObject($parts[1]);
        if (
            $header === null
            || !is_string($header['alg'] ?? null)
            || strtolower($header['alg']) === 'none'
            || $payload === null
        ) {
            return null;
        }

        return $payload;
    }

    private function decodeJwtJsonObject(string $segment): ?array
    {
        $base64 = strtr($segment, '-_', '+/');
        $base64 .= str_repeat('=', (4 - strlen($base64) % 4) % 4);
        $decoded = base64_decode($base64, true);

        if ($decoded === false) {
            return null;
        }

        try {
            $value = json_decode($decoded, false, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return is_object($value) ? (array) $value : null;
    }

    private function validatedAmrMethods(mixed $amr): ?array
    {
        if (!is_array($amr) || !array_is_list($amr) || $amr === []) {
            return null;
        }

        $methods = [];
        foreach ($amr as $entry) {
            if (is_string($entry) && $entry !== '') {
                $methods[] = $entry;
                continue;
            }

            if (is_object($entry)) {
                $entry = get_object_vars($entry);
            }

            if (!is_array($entry) || array_is_list($entry)) {
                return null;
            }

            $method = $entry['method'] ?? null;
            $timestamp = $entry['timestamp'] ?? null;
            if (
                !is_string($method)
                || $method === ''
                || (!is_int($timestamp) && !is_float($timestamp))
                || !is_finite((float) $timestamp)
                || $timestamp < 0
            ) {
                return null;
            }

            $methods[] = $method;
        }

        return $methods;
    }
}
