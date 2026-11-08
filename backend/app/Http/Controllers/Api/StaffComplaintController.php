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
use App\Models\ComplaintEscalation;

class StaffComplaintController extends Controller
{
    //* Show complaints that have completed initial review and left the active intake queue.
    public function staffHistory(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || !$profile->is_active || $profile->role !== 'LGU-Staff') {
            return response()->json([
                'message' => 'Only active LGU-Staff can access complaint history.',
            ], 403);
        }

        $complaints = Complaint::query()
            ->with(['category:id,name', 'barangay:id,name'])
            ->whereIn('status', ['assigned', 'in_progress', 'resolved', 'closed', 'rejected'])
            ->orderByDesc('updated_at')
            ->paginate(10);

        return response()->json([
            'message' => 'Complaint history retrieved successfully.',
            'data' => $complaints->items(),
            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'last_page' => $complaints->lastPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
            ],
        ]);
    }

    //* Display submitted complaints for the LGU-Staff review queue.
    public function staffIndex(Request $request)
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
                'message' => 'Only LGU-Staff can access the complaint queue.',
            ], 403);
        }

        $complaints = Complaint::query()
            ->with([
                'category:id,name',
                'barangay:id,name',
            ])
            ->whereIn('status', ['submitted', 'under_review'])
            ->orderByDesc('created_at')
            ->paginate(10);

        return response()->json([
            'message' => 'Staff complaint queue retrieved successfully.',
            'data' => $complaints->items(),
            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'last_page' => $complaints->lastPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
            ],
        ]);
    }


    //* Review a submitted complaint and determine its handling level.
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

            'resolution_level' => [
                'required_if:decision,accepted',
                'nullable',
                Rule::in(['barangay', 'lgu']),
            ],

            'rejection_reason' => [
                'required_if:decision,rejected',
                'nullable',
                'string',
                'max:100',
            ],

            'review_notes' => [
                'nullable',
                'string',
                'max:1000',
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

        $resolutionLevel = $validated['decision'] === 'accepted'
            ? $validated['resolution_level']
            : null;

        DB::transaction(function () use ($complaint, $profile, $validated, $newStatus, $resolutionLevel) {
            $oldStatus = $complaint->status;

            $complaint->status = $newStatus;
            $complaint->resolution_level = $resolutionLevel;
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
                    : (
                        $validated['review_notes'] ?? 'Complaint accepted.'
                    ) . ' Handling level: ' . $resolutionLevel . '.',
            ]);
        });

        return response()->json([
            'message' => 'Complaint reviewed successfully.',
            'complaint' => $complaint->fresh(),
        ]);
    }

    //* Route or transfer a complaint to the responsible handling unit.
    public function routeComplaint(Request $request, string $complaintId)
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
                'message' => 'Only LGU-Staff can route complaints.',
            ], 403);
        }

        $complaint = Complaint::find($complaintId);

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found.',
            ], 404);
        }

        if (
            !in_array($complaint->status, [
                'under_review',
                'assigned',
                'in_progress',
            ], true)
        ) {
            return response()->json([
                'message' => 'This complaint cannot be routed in its current status.',
            ], 422);
        }

        if (!$complaint->resolution_level) {
            return response()->json([
                'message' => 'The complaint handling level has not been determined.',
            ], 422);
        }

        $rules = [
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
        ];

        if ($complaint->resolution_level === 'lgu') {
            $rules['department_id'] = [
                'required',
                'uuid',
                Rule::exists('departments', 'id'),
            ];
        } else {
            $rules['department_id'] = ['prohibited'];
        }

        $validated = $request->validate($rules);

        $assignee = Profile::find($validated['assigned_to']);

        if (!$assignee || !$assignee->is_active) {
            return response()->json([
                'message' => 'The selected staff account is inactive or unavailable.',
            ], 422);
        }

        if ($complaint->resolution_level === 'barangay') {
            if (
                $assignee->role !== 'Barangay_Head' ||
                $assignee->barangay_id !== $complaint->barangay_id
            ) {
                return response()->json([
                    'message' => 'The complaint must be assigned to the Barangay Head of its barangay.',
                ], 422);
            }

            $assignmentLevel = 'barangay';
            $barangayId = $complaint->barangay_id;
            $departmentId = null;
        } else {
            if (
                $assignee->role !== 'Department_Head' ||
                $assignee->department_id !== $validated['department_id']
            ) {
                return response()->json([
                    'message' => 'The selected recipient must be the Department Head of the destination department.',
                ], 422);
            }

            $assignmentLevel = 'lgu';
            $barangayId = null;
            $departmentId = $validated['department_id'];
        }

        $activeAssignment = ComplaintAssignment::where('complaint_id', $complaint->id)
            ->whereNull('ended_at')
            ->latest('assigned_at')
            ->first();

        if (
            $activeAssignment &&
            $activeAssignment->assigned_to === $assignee->id &&
            $activeAssignment->barangay_id === $barangayId &&
            $activeAssignment->department_id === $departmentId
        ) {
            return response()->json([
                'message' => 'This complaint is already assigned to the selected handling unit.',
            ], 422);
        }

        $assignment = DB::transaction(function () use ($complaint, $profile, $assignee, $validated, $assignmentLevel, $barangayId, $departmentId) {
            // Serialize routing changes for this complaint before ending its
            // current assignment and inserting the next one.
            $lockedComplaint = Complaint::whereKey($complaint->id)
                ->lockForUpdate()
                ->firstOrFail();
            $oldStatus = $lockedComplaint->status;

            ComplaintAssignment::where('complaint_id', $complaint->id)
                ->whereNull('ended_at')
                ->update([
                    'ended_at' => now(),
                    'updated_at' => now(),
                ]);

            $assignment = ComplaintAssignment::create([
                'complaint_id' => $complaint->id,
                'assigned_to' => $assignee->id,
                'assigned_by' => $profile->id,
                'assignment_level' => $assignmentLevel,
                'barangay_id' => $barangayId,
                'department_id' => $departmentId,
                'notes' => $validated['reason'],
                'assigned_at' => now(),
            ]);

            $lockedComplaint->status = 'assigned';
            $lockedComplaint->save();

            ComplaintUpdate::create([
                'complaint_id' => $complaint->id,
                'updated_by' => $profile->id,
                'old_status' => $oldStatus,
                'new_status' => 'assigned',
                'comment' => 'Complaint routed or transferred. Reason: '
                    . $validated['reason'],
            ]);

            return $assignment;
        });

        return response()->json([
            'message' => 'Complaint routed successfully.',
            'assignment' => $assignment->load([
                'assignee',
                'assigner',
            ]),
            'complaint' => $complaint->fresh(),
        ], 201);
    }

    //* Retrieve a complaint for LGU-Staff review.
    public function staffShow(Request $request, string $complaintId)
    {
        $user = $request->attributes->get('supabase_user');

        $profile = Profile::find($user['id']);

        if (!$profile || $profile->role !== 'LGU-Staff') {
            return response()->json([
                'message' => 'Unauthorized.'
            ], 403);
        }

        $complaint = Complaint::with([
            'category:id,name',
            'barangay:id,name',
            'attachments',
        ])->find($complaintId);

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found.'
            ], 404);
        }

        return response()->json([
            'message' => 'Complaint retrieved successfully.',
            'data' => $complaint,
        ]);
    }

    //* Retrieve eligible recipients for complaint routing.
    public function eligibleAssignees(Request $request, string $complaintId)
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
                'message' => 'Only LGU-Staff can view eligible recipients.',
            ], 403);
        }

        $complaint = Complaint::find($complaintId);

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found.',
            ], 404);
        }

        if (!$complaint->resolution_level) {
            return response()->json([
                'message' => 'The complaint handling level has not been determined.',
            ], 422);
        }

        if ($complaint->resolution_level === 'barangay') {
            $assignees = Profile::where('role', 'Barangay_Head')
                ->where('barangay_id', $complaint->barangay_id)
                ->where('is_active', true)
                ->get(['id', 'full_name', 'email', 'barangay_id']);
        } else {
            $assignees = Profile::where('role', 'Department_Head')
                ->whereNotNull('department_id')
                ->where('is_active', true)
                ->get(['id', 'full_name', 'email', 'department_id']);
        }

        return response()->json([
            'message' => 'Eligible recipients retrieved successfully.',
            'data' => $assignees,
        ]);
    }
        //* Display pending barangay-to-department escalation requests.
    public function escalationIndex(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || $profile->role !== 'LGU-Staff') {
            return response()->json([
                'message' => 'Only LGU-Staff can view escalation requests.',
            ], 403);
        }

        $escalations = ComplaintEscalation::with([
            'requester',
            'originBarangay',
            'destinationDepartment',
            'complaint:id,title,status,category_id',
            'complaint.category:id,name',
        ])
            ->where('escalation_type', 'barangay_to_department')
            ->where('status', 'pending')
            ->latest()
            ->paginate(10);

        return response()->json([
            'message' => 'Pending escalation requests retrieved successfully.',
            'data' => $escalations->items(),
            'pagination' => [
                'current_page' => $escalations->currentPage(),
                'last_page' => $escalations->lastPage(),
                'per_page' => $escalations->perPage(),
                'total' => $escalations->total(),
            ],
        ]);
    }

    //* Accept or redirect a barangay-to-department escalation.
    public function reviewEscalation(Request $request, string $escalationId)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || $profile->role !== 'LGU-Staff') {
            return response()->json([
                'message' => 'Only LGU-Staff can review escalation requests.',
            ], 403);
        }

        $validated = $request->validate([
            'decision' => [
                'required',
                Rule::in(['accepted', 'redirected']),
            ],
            'review_comment' => [
                'required',
                'string',
                'min:10',
                'max:1000',
            ],
            'destination_department_id' => [
                'required_if:decision,redirected',
                'nullable',
                'uuid',
                Rule::exists('departments', 'id'),
            ],
        ]);

        $escalation = ComplaintEscalation::find($escalationId);

        if (!$escalation) {
            return response()->json([
                'message' => 'Escalation request not found.',
            ], 404);
        }

        if (
            $escalation->escalation_type !== 'barangay_to_department' ||
            $escalation->status !== 'pending'
        ) {
            return response()->json([
                'message' => 'This escalation request cannot be reviewed.',
            ], 422);
        }

        $destinationDepartmentId = $validated['decision'] === 'redirected'
            ? $validated['destination_department_id']
            : $escalation->destination_department_id;

        $departmentHead = Profile::where('role', 'Department_Head')
            ->where('department_id', $destinationDepartmentId)
            ->where('is_active', true)
            ->first();

        if (!$departmentHead) {
            return response()->json([
                'message' => 'No active Department Head is assigned to the destination department.',
            ], 422);
        }

        $result = DB::transaction(function () use (
            $escalation,
            $profile,
            $validated,
            $destinationDepartmentId,
            $departmentHead
        ) {
            $lockedEscalation = ComplaintEscalation::whereKey($escalation->id)
                ->lockForUpdate()
                ->first();

            if (!$lockedEscalation || $lockedEscalation->status !== 'pending') {
                return response()->json([
                    'message' => 'This escalation request has already been reviewed.',
                ], 422);
            }

            $complaint = Complaint::whereKey($lockedEscalation->complaint_id)
                ->lockForUpdate()
                ->first();

            if (!$complaint) {
                return response()->json([
                    'message' => 'The associated complaint could not be found.',
                ], 404);
            }

            if (!in_array($complaint->status, ['assigned', 'in_progress'], true)) {
                return response()->json([
                    'message' => 'The complaint is no longer eligible for escalation routing.',
                ], 422);
            }

            // End the previous active assignment.
            ComplaintAssignment::where('complaint_id', $complaint->id)
                ->whereNull('ended_at')
                ->update([
                    'ended_at' => now(),
                    'updated_at' => now(),
                ]);

            // Assign the complaint to the destination Department Head.
            $assignment = ComplaintAssignment::create([
                'complaint_id' => $complaint->id,
                'assigned_to' => $departmentHead->id,
                'assigned_by' => $profile->id,
                'assignment_level' => 'lgu',
                'barangay_id' => null,
                'department_id' => $destinationDepartmentId,
                'notes' => 'Barangay escalation reviewed by LGU-Staff. '
                    . 'Original reason: ' . $lockedEscalation->reason
                    . ' Review: ' . $validated['review_comment'],
                'assigned_at' => now(),
            ]);

            $oldStatus = $complaint->status;
            $complaint->status = 'assigned';
            $complaint->resolution_level = 'lgu';
            $complaint->save();

            $lockedEscalation->destination_department_id = $destinationDepartmentId;
            $lockedEscalation->status = $validated['decision'];
            $lockedEscalation->reviewed_by = $profile->id;
            $lockedEscalation->review_comment = $validated['review_comment'];
            $lockedEscalation->reviewed_at = now();
            $lockedEscalation->save();

            ComplaintUpdate::create([
                'complaint_id' => $complaint->id,
                'updated_by' => $profile->id,
                'old_status' => $oldStatus,
                'new_status' => 'assigned',
                'comment' => 'Barangay escalation '
                    . $validated['decision']
                    . '. Review: ' . $validated['review_comment'],
            ]);

            return response()->json([
                'message' => 'Escalation reviewed and complaint routed successfully.',
                'escalation' => $lockedEscalation->fresh()->load([
                    'requester',
                    'originBarangay',
                    'destinationDepartment',
                ]),
                'assignment' => $assignment->load([
                    'assignee',
                    'assigner',
                ]),
                'complaint' => $complaint->fresh(),
            ]);
        });

        return $result;
    }
}
