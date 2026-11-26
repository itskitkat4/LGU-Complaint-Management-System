<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Profile;
use Illuminate\Http\Request;

class AdminComplaintController extends Controller
{
    public function index(Request $request)
    {
        $profile = $this->adminProfile($request);
        if (!$profile) {
            return response()->json(['message' => 'Only active System Administrators can view complaints.'], 403);
        }

        $complaints = Complaint::query()
            ->with(['citizen:id,full_name,email', 'category:id,name', 'barangay:id,name'])
            ->latest()
            ->paginate(10);

        return response()->json([
            'message' => 'Administrative complaint records retrieved successfully.',
            'data' => $complaints->items(),
            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'last_page' => $complaints->lastPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
            ],
        ]);
    }

    public function show(Request $request, string $complaintId)
    {
        if (!$this->adminProfile($request)) {
            return response()->json(['message' => 'Only active System Administrators can view complaints.'], 403);
        }

        $complaint = Complaint::query()
            ->with([
                'citizen:id,full_name,email',
                'category:id,name',
                'barangay:id,name',
                'attachments',
            ])
            ->find($complaintId);

        if (!$complaint) {
            return response()->json(['message' => 'Complaint not found.'], 404);
        }

        return response()->json([
            'message' => 'Administrative complaint details retrieved successfully.',
            'data' => $complaint,
        ]);
    }

    private function adminProfile(Request $request): ?Profile
    {
        $user = $request->attributes->get('supabase_user');
        $profile = !empty($user['id']) ? Profile::find($user['id']) : null;

        return $profile && $profile->is_active && $profile->role === 'System Administrator'
            ? $profile
            : null;
    }
}
