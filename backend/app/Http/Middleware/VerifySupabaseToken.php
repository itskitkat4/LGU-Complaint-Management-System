<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class VerifySupabaseToken
{
    public function handle(Request $request, Closure $next): Response
    {

        $token = $request->bearerToken();

        if (! $token) {
            return response()
            ->json(['message' => 'Unauthenticated'
            ], 401);
        }

        $url = trim(config('services.supabase.url'), '/');
        $key = config('services.supabase.publishable_key');

        if (! $url || ! $key) {
            return response () ->json([
                'message' => 'Supabase Authentication is not configured properly.'
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

        if (! $response->successful()) {
            return response()->json([
                'message' => 'Invalid or Expired token.',
            ], 401);
        }
        $user = $response->json();

        if (! is_array($user) || empty($user['id'])) {
            return response()->json([
                'message' => 'Invalid authentication response from Supabase.',
            ], 401);
        }

        $request->attributes->set('supabase_user', $user);

        return $next($request);
    }
}

