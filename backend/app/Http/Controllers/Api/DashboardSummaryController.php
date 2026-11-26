<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Profile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardSummaryController extends Controller
{
    private const COMPLAINT_STATUSES = [
        'submitted',
        'under_review',
        'accepted',
        'declined',
        'assigned',
        'in_progress',
        'resolved',
    ];

    public function staffSummary(Request $request): JsonResponse
    {
        $profile = $this->activeProfile($request, 'LGU-Staff');
        if ($profile instanceof JsonResponse) {
            return $profile;
        }

        $complaints = Complaint::query();

        return response()->json([
            'statistics' => $this->complaintCounts($complaints) + [
                'resolutions_pending_review' => DB::table('complaint_resolutions')
                    ->where('review_status', 'pending_review')
                    ->count(),
            ],
        ]);
    }

    public function barangaySummary(Request $request): JsonResponse
    {
        $profile = $this->activeProfile($request, 'Barangay_Head');
        if ($profile instanceof JsonResponse) {
            return $profile;
        }

        if (!$profile->barangay_id) {
            return response()->json([
                'message' => 'Your account has no assigned barangay.',
            ], 422);
        }

        $assignmentScope = static function ($query) use ($profile) {
            $query->where('assigned_to', $profile->id)
                ->where('assignment_level', 'barangay')
                ->where('barangay_id', $profile->barangay_id)
                ->whereNull('ended_at');
        };

        $complaints = Complaint::query()
            ->whereHas('activeAssignment', $assignmentScope);

        return response()->json([
            'statistics' => $this->complaintCounts($complaints) + [
                'returned_for_follow_up' => $this->returnedResolutionCount(
                    $complaints
                ),
            ],
        ]);
    }

    public function personnelSummary(Request $request): JsonResponse
    {
        $profile = $this->activeProfile($request, 'Department_Personnel');
        if ($profile instanceof JsonResponse) {
            return $profile;
        }

        if (!$profile->department_id) {
            return response()->json([
                'message' => 'Your account has no assigned department.',
            ], 422);
        }

        $assignmentScope = static function ($query) use ($profile) {
            $query->where('assigned_to', $profile->id)
                ->where('assignment_level', 'lgu')
                ->where('department_id', $profile->department_id)
                ->whereNull('ended_at');
        };

        $complaints = Complaint::query()
            ->whereHas('activeAssignment', $assignmentScope);
        $complaintIds = (clone $complaints)->select('complaints.id');

        return response()->json([
            'statistics' => [
                'my_assignments' => (clone $complaints)->count(),
                'in_progress' => (clone $complaints)
                    ->where('status', 'in_progress')
                    ->count(),
                'returned_for_follow_up' => $this->returnedResolutionCount(
                    $complaints
                ),
                'resolutions_pending_review' => DB::table('complaint_resolutions')
                    ->whereIn('complaint_id', $complaintIds)
                    ->where('submitted_by', $profile->id)
                    ->where('review_status', 'pending_review')
                    ->count(),
            ],
        ]);
    }

    private function activeProfile(Request $request, string $role): Profile|JsonResponse
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);
        if (!$profile || !$profile->is_active || $profile->role !== $role) {
            return response()->json([
                'message' => 'You are not authorized to access these dashboard statistics.',
            ], 403);
        }

        return $profile;
    }

    private function complaintCounts(Builder $complaints): array
    {
        $counts = (clone $complaints)
            ->select('status')
            ->selectRaw('COUNT(complaints.id) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $statistics = ['total_complaints' => (clone $complaints)->count()];
        foreach (self::COMPLAINT_STATUSES as $status) {
            $statistics[$status] = (int) $counts->get($status, 0);
        }

        return $statistics;
    }

    private function returnedResolutionCount(Builder $assignedComplaints): int
    {
        $inProgressComplaintIds = (clone $assignedComplaints)
            ->where('status', 'in_progress')
            ->select('complaints.id');

        return DB::table('complaint_resolutions as returned')
            ->whereIn('returned.complaint_id', $inProgressComplaintIds)
            ->where('returned.review_status', 'returned')
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('complaint_resolutions as newer')
                    ->whereColumn('newer.complaint_id', 'returned.complaint_id')
                    ->where(function ($query) {
                        $query->whereColumn('newer.submitted_at', '>', 'returned.submitted_at')
                            ->orWhere(function ($query) {
                                $query->whereColumn('newer.submitted_at', '=', 'returned.submitted_at')
                                    ->where(function ($query) {
                                        $query->whereColumn('newer.created_at', '>', 'returned.created_at')
                                            ->orWhere(function ($query) {
                                                $query->whereColumn('newer.created_at', '=', 'returned.created_at')
                                                    ->whereColumn('newer.id', '>', 'returned.id');
                                            });
                                    });
                            });
                    });
            })
            ->distinct()
            ->count('returned.complaint_id');
    }
}
