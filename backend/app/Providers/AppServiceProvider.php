<?php

namespace App\Providers;

use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by( $request->ip());
        });

        RateLimiter::for('ai-complaint', function (Request $request) {
            $userId = $request->attributes->get('supabase_user')['id'] ?? null;

            return Limit::perMinute(10)
                ->by($userId ? 'user:' . $userId : 'ip:' . $request->ip())
                ->response(fn () => response()->json([
                    'message' => 'You have sent too many AI assistant requests. Please wait a moment and try again.',
                ], 429));
        });
        
    }
}
