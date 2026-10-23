<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComplaintAttachment;
use App\Models\Profile;
use App\Services\SupabaseStorageService;
use DB;
use Throwable;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

class ComplaintAttachmentController extends Controller
{
    public function signedUrl(Request $request, string $attachmentId, SupabaseStorageService $storage) {

            $user = $request->attributes->get('supabase_user');

            if(!$user || empty($user['id'])) {
                return response()->json([
                    'message' => 'Authentication is required',
                ], 401);
            }

           $profile = Profile::find($user['id']); 

           if (!$profile) {
            return response()->json([
                'message' => 'Profile Not Found',
            ], 403);
        }

        $attachment = ComplaintAttachment::find($attachmentId);

        if(!$attachment) {
            return response()->json([
                'message' => 'Attachment not Found',
            ], 403);
        }

        $complaint = $attachment->complaint;

        if(!$complaint) {
            return response()->json([
                'message' => 'related complaint not found',
            ], 404);
        }

        $allowed = false;

        if ($profile->role === 'citizen') {
            $allowed = $complaint->citizen_id === $profile->id;
        } else if ($profile->role === 'LGU_Staff') {
            $allowed = true;
        } else if ($profile->role === 'Barangay_Head') {
            $allowed = !empty($profile->barangay_id)
                && $complaint->barangay_id === $profile->barangay_id;
        } else if ($profile->role === 'Department_Personnel') {
            $allowed = DB::table('complaint_assignment')
            ->where('complaint_id', $complaint->id)
            ->where('assigned_to', $profile->id)
            ->whereNull('ended_at')->exists();
        } else if ($profile->role === 'Department_Head'
            && !empty($profile->department_id) 
        ) {
             $allowed = DB::table('complaint_assignments as ca')
                ->join('profiles as personnel', 'personnel.id', '=', 'ca.assigned_to')
                ->where('ca.complaint_id', $complaint->id)
                ->whereNull('ca.ended_at')
                ->where('personnel.department_id', $profile->department_id)
                ->exists();
        }

        if (!$allowed) {
            return response()->json([
                'message' => 'You are not authorized to view this attachment.',
            ], 403);
        }

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