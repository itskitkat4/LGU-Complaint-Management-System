<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Feedback;
use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeedbackController extends Controller
{
    public function eligibleComplaints(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || $profile->role !== 'citizen') {
            return response()->json([
                'message' => 'Only citizens can access eligible complaints.',
            ], 403);
        }

        $complaints = Complaint::query()
            ->where('citizen_id', $profile->id)
            ->where('status', 'resolved')
            ->whereDoesntHave('feedback')
            ->with('category:id,name')
            ->select([
                'id',
                'title',
                'category_id',
                'status',
                'created_at',
            ])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'message' => 'Eligible complaints retrieved successfully.',
            'data' => $complaints,
        ]);
    }

     //* Submit feedback for a resolved complaint owned by the citizen.

    public function store(Request $request, string $complaintId)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || $profile->role !== 'citizen') {
            return response()->json([
                'message' => 'Only citizens can submit feedback.',
            ], 403);
        }

        $validated = $request->validate([
            'rating' => [
                'required',
                'integer',
                'between:1,5',
            ],
            'comment' => [
                'required',
                'string',
                'max:2000',
            ],
        ]);

        $result = DB::transaction(function () use (
            $complaintId,
            $profile,
            $validated
        ) {
            $complaint = Complaint::query()
                ->where('id', $complaintId)
                ->where('citizen_id', $profile->id)
                ->lockForUpdate()
                ->first();

            if (!$complaint) {
                return [
                    'error' => 'Complaint not found.',
                    'status' => 404,
                ];
            }

            if ($complaint->status !== 'resolved') {
                return [
                    'error' => 'Feedback can only be submitted for resolved complaints.',
                    'status' => 422,
                ];
            }

            if ($complaint->feedback()->exists()) {
                return [
                    'error' => 'Feedback has already been submitted for this complaint.',
                    'status' => 422,
                ];
            }

            $feedback = Feedback::create([
                'complaint_id' => $complaint->id,
                'citizen_id' => $profile->id,
                'rating' => $validated['rating'],
                'comment' => trim($validated['comment']),
            ]);

            return [
                'feedback' => $feedback,
            ];
        });

        if (isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], $result['status']);
        }

        return response()->json([
            'message' => 'Feedback submitted successfully.',
            'feedback' => $result['feedback'],
        ], 201);
    }
}
