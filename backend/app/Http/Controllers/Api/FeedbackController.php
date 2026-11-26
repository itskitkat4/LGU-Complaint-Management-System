<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Feedback;
use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class FeedbackController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('supabase_user');
        $profile = !empty($user['id']) ? Profile::find($user['id']) : null;

        if (!$profile || !$profile->is_active) {
            return response()->json(['message' => 'An active profile is required.'], 403);
        }

        $roles = ['LGU-Staff', 'Barangay_Head', 'Department_Head', 'citizen'];
        if (!in_array($profile->role, $roles, true)) {
            return response()->json(['message' => 'You are not authorized to view feedback.'], 403);
        }

        if ($profile->role === 'citizen') {
            $statisticsQuery = DB::table('feedback as f')
                ->where('f.citizen_id', $profile->id);
            $statistics = $this->statistics(clone $statisticsQuery);
            $page = Feedback::query()
                ->where('citizen_id', $profile->id)
                ->with('complaint:id,title,is_anonymous')
                ->latest()
                ->paginate(10);

            return response()->json([
                'statistics' => $statistics,
                'data' => $page->items(),
                'pagination' => $this->pagination($page),
            ]);
        }

        if ($profile->role === 'Barangay_Head' && !$profile->barangay_id) {
            return response()->json(['message' => 'Your account has no assigned barangay.'], 422);
        }
        if ($profile->role === 'Department_Head' && !$profile->department_id) {
            return response()->json(['message' => 'Your account has no assigned department.'], 422);
        }

        $filters = $request->validate([
            'handling_unit' => ['nullable', Rule::in(['barangay', 'lgu'])],
            'department_id' => ['nullable', 'uuid', Rule::exists('departments', 'id')],
            'barangay_id' => ['nullable', 'uuid', Rule::exists('barangays', 'id')],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $scopeQuery = $this->applyMonitoringScope(
            $this->attributedFeedbackQuery(),
            $profile,
            $filters
        );

        // Build independent projections from the same single-attribution, filtered
        // scope so PostgreSQL never combines record columns with aggregates.
        $statistics = $this->statistics(clone $scopeQuery);
        $page = (clone $scopeQuery)
            ->select([
                'f.id',
                'f.complaint_id',
                'f.rating',
                'f.comment',
                'f.created_at',
                'c.title as complaint_title',
                'a.assignment_level as handling_unit',
                'a.barangay_id',
                'b.name as barangay_name',
                'a.department_id',
                'd.name as department_name',
                'r.submitted_by as handler_id',
                'handler.full_name as handler_name',
            ])
            ->selectRaw('CASE WHEN c.is_anonymous THEN NULL ELSE f.citizen_id END AS citizen_id')
            ->selectRaw('CASE WHEN c.is_anonymous THEN NULL ELSE citizen.full_name END AS citizen_name')
            ->orderByDesc('f.created_at')
            ->orderByDesc('f.id')
            ->paginate(10);

        return response()->json([
            'statistics' => $statistics,
            'data' => $page->items(),
            'pagination' => $this->pagination($page),
        ]);
    }

    private function attributedFeedbackQuery()
    {
        return DB::table('feedback as f')
            ->join('complaints as c', 'c.id', '=', 'f.complaint_id')
            ->join('complaint_resolutions as r', function ($join) {
                $join->on('r.complaint_id', '=', 'c.id')
                    ->where('r.review_status', '=', 'approved');
            })
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('complaint_resolutions as newer_resolution')
                    ->whereColumn('newer_resolution.complaint_id', 'r.complaint_id')
                    ->where('newer_resolution.review_status', 'approved')
                    ->where(function ($query) {
                        $query->whereColumn('newer_resolution.reviewed_at', '>', 'r.reviewed_at')
                            ->orWhere(function ($query) {
                                $query->whereColumn('newer_resolution.reviewed_at', '=', 'r.reviewed_at')
                                    ->whereColumn('newer_resolution.id', '>', 'r.id');
                            });
                    });
            })
            ->join('complaint_assignments as a', function ($join) {
                $join->on('a.complaint_id', '=', 'c.id')
                    ->on('a.assigned_to', '=', 'r.submitted_by')
                    ->on('a.assignment_level', '=', 'c.resolution_level')
                    ->whereColumn('a.assigned_at', '<=', 'r.submitted_at')
                    ->where(function ($query) {
                        $query->whereNull('a.ended_at')
                            ->orWhereColumn('a.ended_at', '>=', 'r.submitted_at');
                    });
            })
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('complaint_assignments as newer_assignment')
                    ->whereColumn('newer_assignment.complaint_id', 'a.complaint_id')
                    ->whereColumn('newer_assignment.assigned_to', 'a.assigned_to')
                    ->whereColumn('newer_assignment.assignment_level', 'a.assignment_level')
                    ->whereColumn('newer_assignment.assigned_at', '<=', 'r.submitted_at')
                    ->where(function ($query) {
                        $query->whereNull('newer_assignment.ended_at')
                            ->orWhereColumn('newer_assignment.ended_at', '>=', 'r.submitted_at');
                    })
                    ->where(function ($query) {
                        $query->whereColumn('newer_assignment.assigned_at', '>', 'a.assigned_at')
                            ->orWhere(function ($query) {
                                $query->whereColumn('newer_assignment.assigned_at', '=', 'a.assigned_at')
                                    ->whereColumn('newer_assignment.id', '>', 'a.id');
                            });
                    });
            })
            ->join('profiles as handler', 'handler.id', '=', 'r.submitted_by')
            ->leftJoin('profiles as citizen', 'citizen.id', '=', 'f.citizen_id')
            ->leftJoin('departments as d', 'd.id', '=', 'a.department_id')
            ->leftJoin('barangays as b', 'b.id', '=', 'a.barangay_id');
    }

    private function applyMonitoringScope($query, Profile $profile, array $filters)
    {
        if ($profile->role === 'Barangay_Head') {
            $query->where('a.assignment_level', 'barangay')
                ->where('a.barangay_id', $profile->barangay_id);
        } elseif ($profile->role === 'Department_Head') {
            $query->where('a.assignment_level', 'lgu')
                ->where('a.department_id', $profile->department_id);
        }

        if (isset($filters['handling_unit'])) {
            $query->where('a.assignment_level', $filters['handling_unit']);
        }
        if (isset($filters['department_id'])) {
            $query->where('a.department_id', $filters['department_id']);
        }
        if (isset($filters['barangay_id'])) {
            $query->where('a.barangay_id', $filters['barangay_id']);
        }
        if (isset($filters['rating'])) {
            $query->where('f.rating', $filters['rating']);
        }
        if (isset($filters['from'])) {
            $query->whereDate('f.created_at', '>=', $filters['from']);
        }
        if (isset($filters['to'])) {
            $query->whereDate('f.created_at', '<=', $filters['to']);
        }

        return $query;
    }

    private function statistics($query): array
    {
        $result = $query->selectRaw(
            'COUNT(DISTINCT f.id) as total_feedback, '
            . 'COALESCE(AVG(f.rating), 0) as average_rating, '
            . 'COUNT(DISTINCT CASE WHEN f.rating >= 4 THEN f.id END) as positive_ratings, '
            . 'COUNT(DISTINCT CASE WHEN f.rating <= 2 THEN f.id END) as negative_ratings'
        )->first();

        return [
            'total_feedback' => (int) ($result->total_feedback ?? 0),
            'average_rating' => round((float) ($result->average_rating ?? 0), 2),
            'positive_ratings' => (int) ($result->positive_ratings ?? 0),
            'negative_ratings' => (int) ($result->negative_ratings ?? 0),
        ];
    }

    private function pagination($page): array
    {
        return [
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
        ];
    }

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
                'is_anonymous',
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
