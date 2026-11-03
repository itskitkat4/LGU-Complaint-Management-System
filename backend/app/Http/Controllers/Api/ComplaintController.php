<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintAttachment;
use App\Models\ComplaintUpdate;
use App\Models\Profile;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class ComplaintController extends Controller
{

    //* Display a paginated list of complaints submitted by the authenticated citizen.
    public function index(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || $profile->role !== 'citizen') {
            return response()->json([
                'message' => 'Only citizen can access their complaint history',
            ], 403);
        }

        $complaints = Complaint::query()
            ->with(
                'category:id,name',
                'barangay:id,name',
                'attachments:id,complaint_id,file_name,mime_type,file_size,resolution_id',
            )
            ->where('citizen_id', $profile->id)
            ->orderByDesc('created_at')
            ->paginate(10);

        return response()->json([
            'message' => 'Complaint history is retrieve',
            'data' => $complaints->items(),

            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'last_page' => $complaints->lastPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
            ]
        ]);
    }

    //*review who can see the uploaded photo


    public function review(Request $request, string $complaintId)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || $profile->role !== 'LGU-Staff') {
            return response()->json([
                'message' => 'Only LGU-Staff can review complaints.',
            ], 403);
        }

        $validated = $request->validate([
            'decision' => [
                'required',
                Rule::in(['accepted', 'rejected']),
            ],
            'rejection_reason' => [
                'required_if:decision,rejected',
                'nullable',
                'string',
                'max:100',
            ],
        ]);

        $complaint = Complaint::find($complaintId);

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found.',
            ], 404);
        }

        if ($complaint->status !== 'submitted') {
            return response()->json([
                'message' => 'Only submitted complaints can be reviewed.',
            ], 422);
        }

        $newStatus = $validated['decision'] === 'accepted'
            ? 'under_review'
            : 'rejected';

        DB::transaction(function () use ($complaint, $profile, $validated, $newStatus) {
            $oldStatus = $complaint->status;

            $complaint->status = $newStatus;

            $complaint->rejection_reason = $newStatus === 'rejected'
                ? $validated['rejection_reason']
                : null;

            $complaint->save();

            ComplaintUpdate::create([
                'complaint_id' => $complaint->id,
                'updated_by' => $profile->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'comment' => $newStatus === 'rejected'
                    ? $validated['rejection_reason']
                    : 'Complaint accepted by LGU-Staff.',
            ]);
        });

        return response()->json([
            'message' => 'Complaint reviewed successfully.',
            'complaint' => $complaint->fresh(),
        ]);
    }

    public function store(Request $request, SupabaseStorageService $storage)
    {
        // Get the authenticated Supabase user.
        $user = $request->attributes->get('supabase_user');

        // Make sure the authenticated user has an ID and email.
        if (!$user || empty($user['id']) || empty($user['email'])) {
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
            $complaint = DB::transaction(function () use ($profile, $validated, $uploadedFiles, $complaintId) {

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
