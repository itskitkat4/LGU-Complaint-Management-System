<?php
// Defines the namespace where this service belongs.
namespace App\Services;

// Allows this class to receive uploaded files from Laravel requests.
use Illuminate\Http\UploadedFile;

// Allows Laravel to send HTTP requests to the Supabase API.
use Illuminate\Support\Facades\Http;

// Allows this class to throw an exception when an operation fails.
use RuntimeException;

class SupabaseStorageService
{
    /**
     * Uploads a file to Supabase Storage.
     *
     * $file = the uploaded file
     * $path = the destination path inside the bucket
     *
     * void means this method does not return a value.
     */
    public function upload(
        UploadedFile $file,
        string $path
    ): void {

        // Get the Supabase project URL from config/services.php.
        // rtrim removes any trailing slash from the URL.
        $baseUrl = rtrim(
            config('services.supabase.url'),
            '/'
        );

        // Get the Supabase secret key from the Laravel configuration.
        $secretKey = config('services.supabase.secret_key');

        // Get the name of the Storage bucket.
        $bucket = config('services.supabase.storage_bucket');

        // Stop the upload if any required configuration is missing.
        if (!$baseUrl || !$secretKey || !$bucket) {
            throw new RuntimeException(
                'Supabase Storage is not configured.'
            );
        }

        // Encode the bucket name so it is safe to place in a URL.
        $encodedBucket = rawurlencode($bucket);

        // Encode each part of the file path separately.
        // Keeping "/" allows the path to contain folders.
        $encodedPath = implode(
            '/',
            array_map('rawurlencode', explode('/', $path))
        );

        // Start building an HTTP request to Supabase Storage.
        $response = Http::withHeaders([

            // Sends the API key to Supabase for authentication.
            'apikey' => $secretKey,

            // Tells Supabase what type of file is being uploaded.
            'Content-Type' => $file->getMimeType(),

            // Tells Supabase not to overwrite an existing file.
            'x-upsert' => 'false',

        ])

            // Read the uploaded file's actual contents.
            // The MIME type is also supplied as the request body format.
            ->withBody(
                file_get_contents($file->getRealPath()),
                $file->getMimeType()
            )

            // Send the file to the specified bucket and path.
            ->post(
                "{$baseUrl}/storage/v1/object/{$encodedBucket}/{$encodedPath}"
            );

        // Check whether Supabase returned an HTTP error status.
        if ($response->failed()) {

            // Stop and report the HTTP status code.
            // Example: 400, 401, 403, or 409.
            throw new RuntimeException(
                'Supabase Storage upload failed: ' .
                $response->status()
            );
        }

        // If no exception was thrown, the upload request succeeded.
    }

    /**
     * Deletes a file from Supabase Storage.
     *
     * $path = the existing file path inside the bucket
     *
     * void means this method does not return a value.
     */
    public function delete(string $path): void
    {
        // Get the Supabase project URL.
        $baseUrl = rtrim(
            config('services.supabase.url'),
            '/'
        );

        // Get the server-side Supabase secret key.
        $secretKey = config('services.supabase.secret_key');

        // Get the bucket containing the file.
        $bucket = config('services.supabase.storage_bucket');

        // Encode the bucket name for the request URL.
        $encodedBucket = rawurlencode($bucket);

        // Encode the file path while preserving folder separators.
        $encodedPath = implode(
            '/',
            array_map('rawurlencode', explode('/', $path))
        );

        // Send a DELETE request to Supabase Storage.
        $response = Http::withHeaders([

            // Supplies the API key for the request.
            'apikey' => $secretKey,

        ])->delete(
            "{$baseUrl}/storage/v1/object/{$encodedBucket}/{$encodedPath}"
        );

        // Check whether Supabase rejected the delete request.
        if ($response->failed()) {

            // Throw an exception containing the HTTP status code.
            throw new RuntimeException(
                'Supabase Storage cleanup failed: ' .
                $response->status()
            );
        }

        // If no exception was thrown, the delete request succeeded.
    }
}
