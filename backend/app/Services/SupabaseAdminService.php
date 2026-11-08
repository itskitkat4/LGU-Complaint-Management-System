<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class SupabaseAdminService
{
    public function inviteUser(string $email, array $userData = []): array
    {
        $supabaseUrl = config('services.supabase.url');
        $secretKey = config('services.supabase.secret_key');

        if (!$supabaseUrl || !$secretKey) {
            throw new RuntimeException(
                'Supabase configuration is missing.'
            );
        }

        $redirectTo = rtrim(
            config('services.supabase.frontend_url'),
            '/'
        ) . '/set-password';

        $response = Http::acceptJson()
            ->withHeaders([
                'apikey' => $secretKey,
            ])
            ->post(
                rtrim($supabaseUrl, '/') . '/auth/v1/invite?' . http_build_query([
                    'redirect_to' => $redirectTo,
                ]),
                [
                    'email' => $email,
                    'data' => $userData,
                ]
            );

        if ($response->failed()) {
            throw new RuntimeException(
                $response->json('msg')
                ?? $response->json('message')
                ?? 'Failed to send staff invitation.'
            );
        }

        return $response->json();
    }
    public function deleteUser(string $userId): void
    {
        $supabaseUrl = config('services.supabase.url');
        $secretKey = config('services.supabase.secret_key');

        if (!$supabaseUrl || !$secretKey) {
            throw new RuntimeException(
                'Supabase configuration is missing.'
            );
        }

        $response = Http::acceptJson()
            ->withHeaders([
                'apikey' => $secretKey,
            ])
            ->delete(
                rtrim($supabaseUrl, '/') . '/auth/v1/admin/users/' . $userId
            );

        if ($response->failed()) {
            throw new RuntimeException(
                'Failed to delete the Supabase Auth User .'
            );
        }
    }
}
