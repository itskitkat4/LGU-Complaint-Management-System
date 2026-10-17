<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\VerifySupabaseToken;


Route::middleware(VerifySupabaseToken::class)
    ->get('/auth/me', function (Request $request) {
        $user = $request->attributes->get('supabase_user');


        return response()->json([
            'message' => 'Authenticated successfully.',
            'user' => [
                'id' => $user['id'] ?? null,
                'email' => $user['email'] ?? null,
            
            ],
        ]);
    });