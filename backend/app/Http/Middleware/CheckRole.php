<?php

namespace App\Http\Middleware;

use App\Models\Profile;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->attributes->get('supabase_user');

        if(!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Unauthenticated',
            ], 401);
        }

         $profile = Profile::find($user['id']);

        if (!$profile || !in_array($profile->role, $roles, true)) {
            return response()->json([
                'message' => 'You are not authorized to perform this action.',
            ], 403);
        }


        return $next($request);
    }
}
