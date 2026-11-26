<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use RuntimeException;

class SupabaseAdminService
{
    public const PASSWORD_SETUP_COMPLETED_KEY = 'bantayserbisyo_password_setup_completed';

    private function invitationRedirectUrl(): string
    {
        $frontendUrl = config('services.supabase.frontend_url');
        $parts = is_string($frontendUrl) ? parse_url($frontendUrl) : false;
        $host = is_array($parts) ? strtolower($parts['host'] ?? '') : '';
        $scheme = is_array($parts) ? strtolower($parts['scheme'] ?? '') : '';
        $isLocalHost = $host === 'localhost'
            || str_ends_with($host, '.localhost')
            || in_array($host, ['127.0.0.1', '::1'], true);

        if (
            !is_string($frontendUrl)
            || !filter_var($frontendUrl, FILTER_VALIDATE_URL)
            || $scheme !== 'https'
            || $isLocalHost
        ) {
            throw new InvalidArgumentException(
                'Configure FRONTEND_URL with the public HTTPS frontend URL, and allow its /set-password URL in Supabase Auth Redirect URLs.'
            );
        }

        return rtrim($frontendUrl, '/') . '/set-password';
    }

    public function inviteUser(string $email, array $userData = []): array
    {
        $supabaseUrl = config('services.supabase.url');
        $secretKey = config('services.supabase.secret_key');

        if (! $supabaseUrl || ! $secretKey) {
            throw new RuntimeException(
                'Supabase configuration is missing.'
            );
        }

        $redirectTo = $this->invitationRedirectUrl();

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
            $errorCode = $response->json('code') ?? $response->json('error_code');
            $errorMessage = $response->json('msg')
                ?? $response->json('message')
                ?? 'Supabase Auth rejected the invitation submission.';

            Log::error('Supabase invitation submission was rejected.', [
                'operation' => 'invite_user',
                'occurred_at' => now()->toIso8601String(),
                'provider' => 'supabase_auth',
                'response_status' => $response->status(),
                'error_code' => $this->safeDiagnosticCode($errorCode),
                'error_message' => $this->safeDiagnosticMessage((string) $errorMessage, $email, $secretKey),
                'recipient' => $this->maskedRecipient($email),
                'submission_status' => 'rejected',
                'delivery_confirmed' => false,
            ]);

            if ($response->status() === 429) {
                throw new RuntimeException(
                    'Supabase invitation email rate limit exceeded.',
                    429
                );
            }

            if (
                $response->status() === 429
                || $response->json('code') === 'over_email_send_rate_limit'
                || $response->json('error_code') === 'over_email_send_rate_limit'
            ) {
                throw new RuntimeException(
                    'Supabase temporarily limited invitation email delivery. Please wait and try again.',
                    429
                );
            }

            throw new RuntimeException(
                $response->json('msg')
                ?? $response->json('message')
                ?? 'Failed to send staff invitation.'
            );
        }

        Log::info('Supabase accepted the invitation email submission.', [
            'operation' => 'invite_user',
            'occurred_at' => now()->toIso8601String(),
            'provider' => 'supabase_auth',
            'response_status' => $response->status(),
            'error_code' => null,
            'error_message' => null,
            'recipient' => $this->maskedRecipient($email),
            'submission_status' => 'accepted',
            'delivery_confirmed' => false,
        ]);

        return $response->json();
    }

    public function getUser(string $userId): array
    {
        $supabaseUrl = config('services.supabase.url');
        $secretKey = config('services.supabase.secret_key');

        if (!$supabaseUrl || !$secretKey) {
            throw new RuntimeException('Supabase configuration is missing.');
        }

        $response = Http::acceptJson()
            ->withHeaders([
                'apikey' => $secretKey,
            ])
            ->timeout(10)
            ->get(rtrim($supabaseUrl, '/') . '/auth/v1/admin/users/' . rawurlencode($userId));

        if ($response->failed()) {
            throw new RuntimeException('Unable to verify staff invitation status.');
        }

        return $response->json('user') ?? $response->json() ?? [];
    }

    public function listUsers(): array
    {
        $supabaseUrl = config('services.supabase.url');
        $secretKey = config('services.supabase.secret_key');

        if (!$supabaseUrl || !$secretKey) {
            throw new RuntimeException('Supabase configuration is missing.');
        }

        $users = [];
        $page = 1;
        $perPage = 1000;

        do {
            $response = Http::acceptJson()
                ->withHeaders([
                    'apikey' => $secretKey,
                    'Authorization' => 'Bearer ' . $secretKey,
                ])
                ->timeout(10)
                ->get(rtrim($supabaseUrl, '/') . '/auth/v1/admin/users', [
                    'page' => $page,
                    'per_page' => $perPage,
                ]);

            if ($response->failed()) {
                throw new RuntimeException('Unable to retrieve Supabase Auth users.');
            }

            $pageUsers = $response->json('users');

            if (!is_array($pageUsers)) {
                throw new RuntimeException('Supabase returned an invalid Auth users response.');
            }

            foreach ($pageUsers as $user) {
                if (!is_array($user) || !is_string($user['id'] ?? null)) {
                    throw new RuntimeException('Supabase returned an invalid Auth user.');
                }

                $users[$user['id']] = $user;
            }

            $page++;
        } while (count($pageUsers) === $perPage);

        return $users;
    }

    public function markPasswordSetupPending(string $userId): void
    {
        $authUser = $this->getUser($userId);
        $appMetadata = is_array($authUser['app_metadata'] ?? null)
            ? $authUser['app_metadata']
            : [];
        $appMetadata[self::PASSWORD_SETUP_COMPLETED_KEY] = false;

        $this->updateAuthUser($userId, ['app_metadata' => $appMetadata]);
    }

    public function setPasswordAndMarkSetupComplete(
        string $userId,
        string $expectedEmail,
        string $password
    ): void
    {
        $authUser = $this->getUser($userId);
        if (
            ($authUser['id'] ?? null) !== $userId
            || !is_string($authUser['email'] ?? null)
            || strcasecmp($authUser['email'], $expectedEmail) !== 0
        ) {
            throw new InvalidArgumentException('Staff identity does not match the Auth account.');
        }

        $appMetadata = is_array($authUser['app_metadata'] ?? null)
            ? $authUser['app_metadata']
            : [];

        if (($appMetadata[self::PASSWORD_SETUP_COMPLETED_KEY] ?? null) !== false) {
            throw new InvalidArgumentException('Password setup is not pending for this account.');
        }

        $appMetadata[self::PASSWORD_SETUP_COMPLETED_KEY] = true;

        // Supabase applies the password and trusted app_metadata in one Admin API
        // update. A rejected password update therefore cannot mark setup complete.
        $this->updateAuthUser($userId, [
            'password' => $password,
            'app_metadata' => $appMetadata,
        ]);
    }

    private function updateAuthUser(string $userId, array $attributes): void
    {
        $supabaseUrl = config('services.supabase.url');
        $secretKey = config('services.supabase.secret_key');

        if (!$supabaseUrl || !$secretKey) {
            throw new RuntimeException('Supabase configuration is missing.');
        }

        $response = Http::acceptJson()
            ->withHeaders([
                'apikey' => $secretKey,
            ])
            ->timeout(10)
            ->put(
                rtrim($supabaseUrl, '/') . '/auth/v1/admin/users/' . rawurlencode($userId),
                $attributes
            );

        if ($response->failed()) {
            throw new RuntimeException('Supabase could not update the staff password.');
        }
    }

    private function maskedRecipient(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return ($local === '' ? '*' : mb_substr($local, 0, 1) . '***')
            . ($domain === '' ? '' : '@' . $domain);
    }

    private function safeDiagnosticCode(mixed $code): ?string
    {
        if (!is_string($code)) {
            return null;
        }

        $code = preg_replace('/[^A-Za-z0-9_.-]/', '', $code);

        return $code === '' ? null : mb_substr($code, 0, 100);
    }

    private function safeDiagnosticMessage(string $message, string $email, string $secretKey): string
    {
        $message = str_replace([$secretKey, $email], ['[redacted]', $this->maskedRecipient($email)], $message);
        $message = preg_replace('~https?://[^\s"\'<>]+~i', '[redacted-url]', $message) ?? '';
        $message = preg_replace('/\b(token|access_token|refresh_token|invite_token|password|secret(?:_key)?)\s*[:=]\s*[^\s,;]+/i', '$1=[redacted]', $message) ?? '';
        $message = preg_replace('/Bearer\s+\S+/i', 'Bearer [redacted]', $message) ?? '';
        $message = preg_replace('/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/', '[redacted-token]', $message) ?? '';
        $message = preg_replace('/\b[a-f0-9]{32,}\b/i', '[redacted-token]', $message) ?? '';

        return mb_substr(trim($message), 0, 300);
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
                'Authorization' => 'Bearer ' . $secretKey,
            ])
            ->timeout(10)
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
