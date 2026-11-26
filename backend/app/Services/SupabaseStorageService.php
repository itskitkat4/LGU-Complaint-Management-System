<?php
namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class SupabaseStorageService
{
    /**
     * Upload a file to a Supabase Storage bucket.
     *
     * Existing calls continue using complaint-attachments.
     * Pass a third argument to select another bucket.
     */
    public function upload(
        UploadedFile $file,
        string $path,
        ?string $bucket = null
    ): void {
        $baseUrl = rtrim(
            (string) config('services.supabase.url'),
            '/'
        );

        $secretKey = config('services.supabase.secret_key');

        $bucket = $bucket
            ?? config('services.supabase.storage_bucket');

        if (!$baseUrl || !$secretKey || !$bucket) {
            throw new RuntimeException(
                'Supabase Storage is not configured.'
            );
        }

        if (!is_file($file->getRealPath())) {
            throw new RuntimeException(
                'The file to upload could not be found.'
            );
        }

        $encodedBucket = rawurlencode($bucket);
        $encodedPath = $this->encodePath($path);

        $mimeType = $file->getMimeType()
            ?: 'application/octet-stream';

        $fileContents = file_get_contents($file->getRealPath());

        if ($fileContents === false) {
            throw new RuntimeException(
                'Unable to read the file for Supabase Storage upload.'
            );
        }

        $response = Http::withHeaders([
            'apikey' => $secretKey,
            'Content-Type' => $mimeType,
            'x-upsert' => 'false',
        ])
            ->withBody($fileContents, $mimeType)
            ->post(
                "{$baseUrl}/storage/v1/object/{$encodedBucket}/{$encodedPath}"
            );

        if ($response->failed()) {
            throw new RuntimeException(
                'Supabase Storage upload failed: HTTP '
                . $response->status()
                . ' - '
                . substr($response->body(), 0, 1000)
            );
        }
    }

    /**
     * Delete a file from a Supabase Storage bucket.
     */
    public function delete(
        string $path,
        ?string $bucket = null
    ): void {
        $baseUrl = rtrim(
            (string) config('services.supabase.url'),
            '/'
        );

        $secretKey = config('services.supabase.secret_key');

        $bucket = $bucket
            ?? config('services.supabase.storage_bucket');

        if (!$baseUrl || !$secretKey || !$bucket) {
            throw new RuntimeException(
                'Supabase Storage is not configured.'
            );
        }

        $encodedBucket = rawurlencode($bucket);
        $encodedPath = $this->encodePath($path);

        $response = Http::withHeaders([
            'apikey' => $secretKey,
        ])->delete(
            "{$baseUrl}/storage/v1/object/{$encodedBucket}/{$encodedPath}"
        );

        if ($response->failed()) {
            throw new RuntimeException(
                'Supabase Storage cleanup failed: HTTP '
                . $response->status()
                . ' - '
                . substr($response->body(), 0, 1000)
            );
        }
    }

    /**
     * Generate a temporary signed URL for a private file.
     */
    public function createSignedUrl(
        string $path,
        int $expiresIn = 300,
        ?string $bucket = null
    ): string {
        $baseUrl = rtrim(
            (string) config('services.supabase.url'),
            '/'
        );

        $secretKey = config('services.supabase.secret_key');

        $bucket = $bucket
            ?? config('services.supabase.storage_bucket');

        if (!$baseUrl || !$secretKey || !$bucket) {
            throw new RuntimeException(
                'Supabase Storage is not configured.'
            );
        }

        if ($expiresIn < 1) {
            throw new RuntimeException(
                'Signed URL expiration must be greater than zero.'
            );
        }

        $encodedBucket = rawurlencode($bucket);
        $encodedPath = $this->encodePath($path);

        $response = Http::withHeaders([
            'apikey' => $secretKey,
        ])->post(
            "{$baseUrl}/storage/v1/object/sign/{$encodedBucket}/{$encodedPath}",
            [
                'expiresIn' => $expiresIn,
            ]
        );

        if ($response->failed()) {
            throw new RuntimeException(
                'Unable to generate a signed Storage URL. HTTP '
                . $response->status()
                . ' - '
                . substr($response->body(), 0, 1000)
            );
        }

        $signedPath = $response->json('signedURL');

        if (!is_string($signedPath) || $signedPath === '') {
            throw new RuntimeException(
                'Supabase did not return a signed URL.'
            );
        }

        if (str_starts_with($signedPath, '/')) {
            return $baseUrl . '/storage/v1' . $signedPath;
        }

        return $signedPath;
    }

    /**
     * Encode individual path segments while preserving folder separators.
     */
    private function encodePath(string $path): string
    {
        if ($path === '') {
            throw new RuntimeException(
                'Storage file path cannot be empty.'
            );
        }

        return implode(
            '/',
            array_map(
                'rawurlencode',
                explode('/', $path)
            )
        );
    }
}
