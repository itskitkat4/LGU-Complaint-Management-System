<?php
// Defines the namespace for API controllers.
namespace App\Http\Controllers\Api;

// Base Laravel controller.
use App\Http\Controllers\Controller;

// Models used to access database tables.
use App\Models\Complaint;
use App\Models\ComplaintAttachment;
use App\Models\ComplaintUpdate;
use App\Models\Profile;

// Service responsible for uploading and deleting Supabase files.
use App\Services\SupabaseStorageService;

// Handles incoming HTTP requests.
use Illuminate\Http\Request;

// Allows database operations to run inside a transaction.
use Illuminate\Support\Facades\DB;

// Writes errors to Laravel's log file.
use Illuminate\Support\Facades\Log;

// Generates UUIDs for complaint IDs and file names.
use Illuminate\Support\Str;

// Adds database rules to Laravel validation.
use Illuminate\Validation\Rule;

// Catches different types of PHP errors and exceptions.
use Throwable;

class ComplaintController extends Controller
{
    /**
     * Creates a new complaint submitted by a citizen.
     */
    public function store(
        Request $request,
        SupabaseStorageService $storage
    ) {
        // Get the authenticated Supabase user.
        // VerifySupabaseToken middleware must set this attribute first.
        $user = $request->attributes->get('supabase_user');

        // Make sure the authenticated user has an ID and email.
        if (
            !$user ||
            empty($user['id']) ||
            empty($user['email'])
        ) {
            // Return HTTP 401 if user information is missing.
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        // Find this user's profile using the Supabase user ID.
        $profile = Profile::find($user['id']);

        // Only citizens are allowed to submit complaints.
        if (!$profile || $profile->role !== 'citizen') {
            // Return HTTP 403 if the user is not an authorized citizen.
            return response()->json([
                'message' => 'Only authorized citizens can submit complaints.',
            ], 403);
        }

        // A citizen must have a barangay assigned to their profile.
        if (empty($profile->barangay_id)) {
            // Return HTTP 422 when the profile is incomplete.
            return response()->json([
                'message' => 'Please complete your profile and select your barangay.',
            ], 422);
        }

        // Validate complaint details and optional attachments.
        $validated = $request->validate([
            // Category must be a UUID for an active complaint category.
            'category_id' => [
                'required',
                'uuid',
                Rule::exists('complaint_categories', 'id')
                    ->where('is_active', true),
            ],

            // Title is required and cannot exceed 255 characters.
            'title' => ['required', 'string', 'max:255'],

            // Description is required and must have at least 10 characters.
            'description' => ['required', 'string', 'min:10'],

            // Attachments are optional; allow up to five files.
            'attachments' => ['sometimes', 'array', 'max:5'],

            // Each attachment must be a supported image up to 5 MB.
            'attachments.*' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],
        ]);

        // Retrieve the uploaded files, or an empty array if none were sent.
        $files = $request->file('attachments', []);

        // Generate a unique ID for this complaint before uploading files.
        $complaintId = (string) Str::uuid();

        // Track successfully uploaded files so they can be deleted if needed.
        $uploadedFiles = [];

        /*
         * Upload files before saving database records.
         * The backend generates the file paths rather than trusting
         * a path supplied by the client.
         */
        try {
            // Process each uploaded attachment.
            foreach ($files as $file) {

                // Determine the file extension.
                // Use jpg as a fallback if the extension cannot be guessed.
                $extension = strtolower(
                    $file->guessExtension() ?: 'jpg'
                );

                // Build a unique path inside the Supabase bucket.
                $path = sprintf(
                    'complaints/%s/%s.%s',
                    $complaintId,
                    Str::uuid(),
                    $extension
                );

                // Upload the file to Supabase Storage.
                $storage->upload($file, $path);

                // Save file details in memory for later database insertion.
                $uploadedFiles[] = [
                    'path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                ];
            }
        } catch (Throwable $exception) {

            // If an upload fails, remove files already uploaded successfully.
            $this->cleanupUploadedFiles($storage, $uploadedFiles);

            // Record the technical error for debugging.
            // The actual error is not exposed to the citizen.
            Log::error('Complaint attachment upload failed.', [
                'complaint_id' => $complaintId,
                'error' => $exception->getMessage(),
            ]);

            // Return an HTTP 502 response to indicate an upstream failure.
            return response()->json([
                'message' => 'Attachment upload failed. Please try again.',
            ], 502);
        }

        /*
         * Save the complaint and related database records together.
         * A database transaction rolls back database changes if an
         * operation inside the transaction fails.
         */
        try {
            // Run the database operations inside one transaction.
            $complaint = DB::transaction(function () use (
                $profile,
                $validated,
                $uploadedFiles,
                $complaintId
            ) {

                // Create the main complaint record.
                $complaint = Complaint::create([
                    'id' => $complaintId,
                    'citizen_id' => $profile->id,
                    'category_id' => $validated['category_id'],
                    'barangay_id' => $profile->barangay_id,
                    'title' => $validated['title'],
                    'description' => $validated['description'],
                    'priority' => 'medium',
                    'status' => 'submitted',
                ]);

                // Create the initial complaint status history record.
                ComplaintUpdate::create([
                    'complaint_id' => $complaint->id,
                    'updated_by' => $profile->id,
                    'old_status' => null,
                    'new_status' => 'submitted',
                    'comment' => 'Complaint submitted by citizen.',
                ]);

                // Create a database record for every uploaded attachment.
                foreach ($uploadedFiles as $uploadedFile) {
                    ComplaintAttachment::create([
                        'complaint_id' => $complaint->id,
                        'uploaded_by' => $profile->id,
                        'file_path' => $uploadedFile['path'],
                        'file_name' => $uploadedFile['file_name'],
                        'mime_type' => $uploadedFile['mime_type'],
                        'file_size' => $uploadedFile['file_size'],
                    ]);
                }

                // Load the complaint's attachments before returning it.
                return $complaint->load('attachments');
            });
        } catch (Throwable $exception) {

            // A database rollback cannot delete files from Supabase.
            // Manually remove uploaded files if database saving fails.
            $this->cleanupUploadedFiles($storage, $uploadedFiles);

            // Log the technical error for the developer.
            Log::error('Complaint database operation failed.', [
                'complaint_id' => $complaintId,
                'error' => $exception->getMessage(),
            ]);

            // Tell the frontend that the complaint could not be saved.
            return response()->json([
                'message' => 'Unable to save the complaint. Please try again.',
            ], 500);
        }

        // Return the saved complaint and its attachments to the frontend.
        // HTTP 201 means a resource was successfully created.
        return response()->json([
            'message' => 'Complaint submitted successfully.',
            'complaint' => $complaint,
        ], 201);
    }

    /**
     * Attempts to delete uploaded files when a later operation fails.
     */
    private function cleanupUploadedFiles(
        SupabaseStorageService $storage,
        array $uploadedFiles
    ): void {

        // Process every file that was successfully uploaded.
        foreach ($uploadedFiles as $uploadedFile) {
            try {
                // Delete the file from Supabase Storage using its saved path.
                $storage->delete($uploadedFile['path']);
            } catch (Throwable $exception) {

                // Log cleanup failures so they can be investigated later.
                Log::error('Failed to clean up a complaint attachment.', [
                    'path' => $uploadedFile['path'],
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }
}
