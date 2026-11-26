<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\ComplaintUpdate;
use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DepartmentComplaintController extends Controller
{

    public function departmentHeadIndex(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (
            !$profile ||
            !$profile->is_active ||
            $profile->role !== 'Department_Head'
        ) {
            return response()->json([
                'message' => 'Only active Department Heads can access this complaint queue.',
            ], 403);
        }

        if (!$profile->department_id) {
            return response()->json([
                'message' => 'Your account has no assigned department.',
            ], 422);
        }

        // Retrieve complaints currently assigned to this Department Head.
        $complaints = Complaint::whereHas('activeAssignment', function ($query) use ($profile) {
            $query->where('assigned_to', $profile->id)
                ->where('assignment_level', 'lgu')
                ->where('department_id', $profile->department_id)
                ->whereNull('ended_at');
        })
            ->with([
                'citizen',
                'category',
                'barangay',
                'activeAssignment.assignee',
            ])
            ->latest()
            ->paginate(10);

        return response()->json([
            'message' => 'Department complaints retrieved successfully.',
            'data' => $complaints->items(),
            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'last_page' => $complaints->lastPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
            ],
        ]);
    }

    public function monitoringIndex(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (
            !$profile ||
            !$profile->is_active ||
            $profile->role !== 'Department_Head'
        ) {
            return response()->json([
                'message' => 'Only active Department Heads can access department monitoring.',
            ], 403);
        }

        if (!$profile->department_id) {
            return response()->json([
                'message' => 'Your account has no assigned department.',
            ], 422);
        }

        $departmentAssignment = static function ($query) use ($profile) {
            $query->where('assignment_level', 'lgu')
                ->where('department_id', $profile->department_id)
                ->whereNull('ended_at');
        };

        $departmentComplaints = Complaint::query()
            ->whereHas('activeAssignment', $departmentAssignment);

        $statusCounts = (clone $departmentComplaints)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $statuses = [
            'submitted',
            'under_review',
            'accepted',
            'declined',
            'assigned',
            'in_progress',
            'resolved',
        ];
        $statusCounts = collect($statuses)
            ->mapWithKeys(fn (string $status) => [
                $status => (int) $statusCounts->get($status, 0),
            ]);

        $awaitingAssignment = (clone $departmentComplaints)
            ->where('status', 'assigned')
            ->whereHas('activeAssignment', function ($query) use ($profile) {
                $query->where('assigned_to', $profile->id)
                    ->where('assignment_level', 'lgu')
                    ->where('department_id', $profile->department_id)
                    ->whereNull('ended_at');
            })
            ->count();

        $complaints = $departmentComplaints
            ->with([
                'citizen',
                'category',
                'barangay',
                'activeAssignment' => function ($query) use ($departmentAssignment) {
                    $departmentAssignment($query);
                    $query->with('assignee');
                },
                'escalations' => function ($query) {
                    $query->where('escalation_type', 'department_to_higher_authority')
                        ->orderByDesc('created_at')
                        ->orderByDesc('id');
                },
            ])
            ->latest()
            ->paginate(10);

        return response()->json([
            'message' => 'Department monitoring data retrieved successfully.',
            'data' => $complaints->items(),
            'status_counts' => $statusCounts,
            'assignment_counts' => [
                'awaiting_assignment' => $awaitingAssignment,
            ],
            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'last_page' => $complaints->lastPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
            ],
        ]);
    }

    public function eligiblePersonnel(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (
            !$profile ||
            !$profile->is_active ||
            $profile->role !== 'Department_Head'
        ) {
            return response()->json([
                'message' => 'Only active Department Heads can view eligible personnel.',
            ], 403);
        }

        if (!$profile->department_id) {
            return response()->json([
                'message' => 'Your account has no assigned department.',
            ], 422);
        }

        $personnel = Profile::where('role', 'Department_Personnel')
            ->where('department_id', $profile->department_id)
            ->where('is_active', true)
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'email', 'department_id']);

        return response()->json([
            'message' => 'Eligible Department Personnel retrieved successfully.',
            'data' => $personnel,
        ]);
    }

    public function personnelIndex(Request $request)
    {
        // Get the authenticated Department Personnel.
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        // Only active Department Personnel can access this queue.
        if (
            !$profile || !$profile->is_active || $profile->role !== 'Department_Personnel'
        ) {
            return response()->json([
                'message' => 'Only active Department Personnel can access this complaint queue.',
            ], 403);
        }

        if (!$profile->department_id) {
            return response()->json([
                'message' => 'Your account has no assigned department.',
            ], 422);
        }

        // Retrieve only complaints currently assigned to this personnel.
        $complaints = Complaint::whereHas('activeAssignment', function ($query) use ($profile) {
            $query->where('assigned_to', $profile->id)
                ->where('assignment_level', 'lgu')
                ->where('department_id', $profile->department_id)
                ->whereNull('ended_at');
        })
            ->with([
                'citizen',
                'category',
                'barangay',
                'activeAssignment.assignee',
            ])
            ->latest()
            ->paginate(10);

        return response()->json([
            'message' => 'Department Personnel complaints retrieved successfully.',
            'data' => $complaints->items(),
            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'last_page' => $complaints->lastPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
            ],
        ]);
    }

    public function personnelShow(Request $request, string $complaintId)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (
            !$profile ||
            !$profile->is_active ||
            $profile->role !== 'Department_Personnel'
        ) {
            return response()->json([
                'message' => 'Only active Department Personnel can view complaint details.',
            ], 403);
        }

        if (!$profile->department_id) {
            return response()->json([
                'message' => 'Your account has no assigned department.',
            ], 422);
        }

        $complaint = Complaint::whereKey($complaintId)
            ->whereHas('activeAssignment', function ($query) use ($profile) {
                $query->where('assigned_to', $profile->id)
                    ->where('assignment_level', 'lgu')
                    ->where('department_id', $profile->department_id)
                    ->whereNull('ended_at');
            })
            ->with([
                'citizen',
                'category',
                'barangay',
                'attachments',
                'activeAssignment.assignee',
            ])
            ->first();

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found or is not currently assigned to you.',
            ], 404);
        }

        return response()->json([
            'message' => 'Complaint details retrieved successfully.',
            'data' => $complaint,
        ]);
    }

    public function startWork(Request $request, string $complaintId)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (
            !$profile ||
            !$profile->is_active ||
            $profile->role !== 'Department_Personnel'
        ) {
            return response()->json([
                'message' => 'Only active Department Personnel can start working on complaints.',
            ], 403);
        }

        $complaint = Complaint::find($complaintId);

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found.',
            ], 404);
        }

        DB::transaction(function () use ($complaint, $profile) {
            $lockedComplaint = Complaint::whereKey($complaint->id)
                ->lockForUpdate()
                ->firstOrFail();

            $assignment = ComplaintAssignment::where(
                'complaint_id',
                $lockedComplaint->id
            )
                ->where('assigned_to', $profile->id)
                ->where('assignment_level', 'lgu')
                ->where('department_id', $profile->department_id)
                ->whereNull('ended_at')
                ->lockForUpdate()
                ->first();

            if (!$assignment) {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(
                    response()->json([
                        'message' => 'This complaint is not currently assigned to you.',
                    ], 403)
                );
            }

            if ($lockedComplaint->status !== 'assigned') {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(
                    response()->json([
                        'message' => 'This complaint has already been started or its status has changed.',
                    ], 422)
                );
            }

            $lockedComplaint->status = 'in_progress';
            $lockedComplaint->save();

            ComplaintUpdate::create([
                'complaint_id' => $lockedComplaint->id,
                'updated_by' => $profile->id,
                'old_status' => 'assigned',
                'new_status' => 'in_progress',
                'comment' => 'Department Personnel started working on the complaint.',
            ]);
        });

        return response()->json([
            'message' => 'Complaint work started successfully.',
            'data' => $complaint->fresh(),
        ]);
    }

    public function assignPersonnel(Request $request, string $complaintId)
    {
        // Get the authenticated Department Head.
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || $profile->role !== 'Department_Head') {
            return response()->json([
                'message' => 'Only Department Heads can assign personnel.',
            ], 403);
        }

        if (!$profile->department_id) {
            return response()->json([
                'message' => 'Your account has no assigned department.',
            ], 422);
        }

        // Find the complaint.
        $complaint = Complaint::find($complaintId);

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found.',
            ], 404);
        }

        if ($complaint->resolution_level !== 'lgu') {
            return response()->json([
                'message' => 'Only LGU-level complaints can be assigned to department personnel.',
            ], 422);
        }

        if (!in_array($complaint->status, ['assigned', 'in_progress'], true)) {
            return response()->json([
                'message' => 'This complaint cannot be assigned in its current status.',
            ], 422);
        }

        // Validate the selected personnel and assignment reason.
        $validated = $request->validate([
            'assigned_to' => [
                'required',
                'uuid',
                Rule::exists('profiles', 'id'),
            ],
            'reason' => [
                'required',
                'string',
                'min:10',
                'max:1000',
            ],
        ]);

        // The selected person must belong to the same department.
        $assignee = Profile::find($validated['assigned_to']);

        if (
            !$assignee ||
            !$assignee->is_active ||
            $assignee->role !== 'Department_Personnel' ||
            $assignee->department_id !== $profile->department_id
        ) {
            return response()->json([
                'message' => 'You can only assign complaints to active personnel in your own department.',
            ], 422);
        }

        // Check the current active assignment.
        $activeAssignment = ComplaintAssignment::where('complaint_id', $complaint->id)
            ->whereNull('ended_at')
            ->latest('assigned_at')
            ->first();

        if (
            !$activeAssignment ||
            $activeAssignment->assignment_level !== 'lgu' ||
            $activeAssignment->department_id !== $profile->department_id
        ) {
            return response()->json([
                'message' => 'This complaint is not currently handled by your department.',
            ], 403);
        }

        if ($activeAssignment->assigned_to === $assignee->id) {
            return response()->json([
                'message' => 'This personnel is already assigned to the complaint.',
            ], 422);
        }

        // End the previous assignment and create the personnel assignment.
        $assignment = DB::transaction(function () use ($complaint, $profile, $assignee, $validated) {
            // Serialize reassignment against other handlers for this complaint.
            $lockedComplaint = Complaint::whereKey($complaint->id)
                ->lockForUpdate()
                ->firstOrFail();
            $oldStatus = $lockedComplaint->status;

            // Recheck complaint status after locking.
            if (
                $lockedComplaint->resolution_level !== 'lgu' ||
                !in_array($lockedComplaint->status, ['assigned', 'in_progress'], true)
            ) {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(
                    response()->json([
                        'message' => 'This complaint can no longer be assigned in its current status.',
                    ], 422)
                );
            }
            // Recheck the active assignment after locking.
            $currentAssignment = ComplaintAssignment::where(
                'complaint_id',
                $lockedComplaint->id
            )
                ->whereNull('ended_at')
                ->lockForUpdate()
                ->latest('assigned_at')
                ->first();

            if (
                !$currentAssignment ||
                $currentAssignment->assignment_level !== 'lgu' ||
                $currentAssignment->department_id !== $profile->department_id
            ) {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(
                    response()->json([
                        'message' => 'This complaint is no longer assigned to your department.',
                    ], 403)
                );
            }

            if ($currentAssignment->assigned_to === $assignee->id) {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(
                    response()->json([
                        'message' => 'This personnel is already assigned to the complaint.',
                    ], 422)
                );
            }

            // End the previous active assignment.
            ComplaintAssignment::where('complaint_id', $complaint->id)
                ->whereNull('ended_at')
                ->update([
                    'ended_at' => now(),
                    'updated_at' => now(),
                ]);

            // Assign the complaint to the selected personnel.
            $assignment = ComplaintAssignment::create([
                'complaint_id' => $complaint->id,
                'assigned_to' => $assignee->id,
                'assigned_by' => $profile->id,
                'assignment_level' => 'lgu',
                'barangay_id' => null,
                'department_id' => $profile->department_id,
                'notes' => $validated['reason'],
                'assigned_at' => now(),
            ]);

            // Set the complaint to assigned.
            $lockedComplaint->status = 'assigned';
            $lockedComplaint->save();

            // Record the personnel assignment in complaint history.
            ComplaintUpdate::create([
                'complaint_id' => $complaint->id,
                'updated_by' => $profile->id,
                'old_status' => $oldStatus,
                'new_status' => 'assigned',
                'comment' => 'Department Head assigned complaint to Department Personnel. Reason: '
                    . $validated['reason'],
            ]);

            return $assignment;
        });

        return response()->json([
            'message' => 'Complaint assigned to Department Personnel successfully.',
            'assignment' => $assignment->load([
                'assignee',
                'assigner',
            ]),
            'complaint' => $complaint->fresh(),
        ], 201);
    }
}
