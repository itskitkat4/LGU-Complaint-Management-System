<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComplaintAttachment;
use App\Models\Profile;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class ComplaintAttachmentController extends Controller
{
    public function signedUrl(
        Request $request,
        string $attachmentId,
        SupabaseStorageService $storage
    ) {
        //* Get authenticated Supabase user
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], 401);
        }

        // * Find the user's profile
        $profile = Profile::find($user['id']);

        if (!$profile) {
            return response()->json([
                'message' => 'Profile not found.',
            ], 403);
        }

        // * Find the requested attachment
        $attachment = ComplaintAttachment::find($attachmentId);

        if (!$attachment) {
            return response()->json([
                'message' => 'Attachment not found.',
            ], 404);
        }

        // * Get the complaint related to this attachment
        $complaint = $attachment->complaint;

        if (!$complaint) {
            return response()->json([
                'message' => 'Related complaint not found.',
            ], 404);
        }

        // * Check whether the user is authorized
        $allowed = false;

        if ($profile->role === 'citizen') {
            // Citizens can only access their own complaints
            $allowed = $complaint->citizen_id === $profile->id;

        } elseif ($profile->role === 'LGU-Staff') {
            // LGU-Staff can access complaint attachments for review
            $allowed = true;

        } elseif ($profile->role === 'Barangay_Head') {
            // Barangay Head can access complaints in their barangay
            $allowed = !empty($profile->barangay_id)
                && $complaint->barangay_id === $profile->barangay_id;

        } elseif ($profile->role === 'Department_Personnel') {
            // Personnel can access complaints actively assigned to them
            $allowed = DB::table('complaint_assignments')
                ->where('complaint_id', $complaint->id)
                ->where('assigned_to', $profile->id)
                ->whereNull('ended_at')
                ->exists();

        } elseif (
            $profile->role === 'Department_Head'
            && !empty($profile->department_id)
        ) {
            // Department Head can access complaints assigned
            // to active personnel belonging to their department
            $allowed = DB::table('complaint_assignments as ca')
                ->join(
                    'profiles as personnel',
                    'personnel.id',
                    '=',
                    'ca.assigned_to'
                )
                ->where('ca.complaint_id', $complaint->id)
                ->whereNull('ca.ended_at')
                ->where('personnel.department_id', $profile->department_id)
                ->where('personnel.role', 'Department_Personnel')
                ->exists();
        }

        if (!$allowed) {
            return response()->json([
                'message' => 'You are not authorized to view this attachment.',
            ], 403);
        }

        // * Generate a temporary signed URL
        try {
            $url = $storage->createSignedUrl($attachment->file_path);

            return response()->json([
                'signed_url' => $url,
                'expires_in' => 300,
            ]);

        } catch (Throwable $exception) {
            Log::error('Failed to generate attachment signed URL.', [
                'attachment_id' => $attachment->id,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Unable to retrieve the attachment right now.',
            ], 502);
        }
    }
}
