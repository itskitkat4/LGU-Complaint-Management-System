<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\ComplaintResolution;
use App\Models\ComplaintResolutionAttachment;
use App\Models\ComplaintUpdate;
use App\Models\Notification;
use App\Models\Profile;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class ComplaintResolutionController extends Controller
{
    /**
     * Submit a complaint resolution with optional evidence files.
     * Allowed handlers: Barangay Head and Department Personnel.
     */
    public function store(
        Request $request,
        string $complaintId,
        SupabaseStorageService $storage
    ) {
        // Get the authenticated Supabase user.
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        // Only active Barangay Heads and Department Personnel can submit.
        if (
            !$profile || !$profile->is_active ||
            !in_array($profile->role, [
                'Barangay_Head',
                'Department_Personnel',
            ], true)
        ) {
            return response()->json([
                'message' => 'You are not authorized to submit a resolution.',
            ], 403);
        }

        // Validate the resolution description and evidence files.
        $validated = $request->validate([
            'resolution_description' => [
                'required',
                'string',
                'min:10',
                'max:10000',
            ],
            'evidence' => [
                'nullable',
                'array',
                'max:5',
            ],
            'evidence.*' => [
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'max:10240',
            ],
        ]);

        $complaint = Complaint::find($complaintId);

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found.',
            ], 404);
        }

        // A resolution can only be submitted while the complaint is in progress.
        if ($complaint->status !== 'in_progress') {
            return response()->json([
                'message' => 'Only complaints currently in progress can receive a resolution.',
            ], 422);
        }

        // Verify that the handler currently owns the active assignment.
        $assignmentQuery = ComplaintAssignment::where(
            'complaint_id',
            $complaint->id
        )
            ->where('assigned_to', $profile->id)
            ->whereNull('ended_at');

        if ($profile->role === 'Barangay_Head') {
            $assignmentQuery
                ->where('assignment_level', 'barangay')
                ->where('barangay_id', $profile->barangay_id);

            if (
                !$profile->barangay_id ||
                $complaint->resolution_level !== 'barangay' ||
                $complaint->barangay_id !== $profile->barangay_id
            ) {
                return response()->json([
                    'message' => 'You can only submit resolutions for complaints assigned to your barangay.',
                ], 403);
            }
        }

        if ($profile->role === 'Department_Personnel') {
            $assignmentQuery
                ->where('assignment_level', 'lgu')
                ->where('department_id', $profile->department_id);

            if (
                !$profile->department_id ||
                $complaint->resolution_level !== 'lgu'
            ) {
                return response()->json([
                    'message' => 'You can only submit resolutions for LGU-level complaints assigned to your department.',
                ], 403);
            }
        }

        if (!$assignmentQuery->exists()) {
            return response()->json([
                'message' => 'You are not the current handler of this complaint.',
            ], 403);
        }

        // Prevent another submission while a previous resolution is pending review.
        if (
            $complaint->resolutions()
                ->where('review_status', 'pending_review')
                ->exists()
        ) {
            return response()->json([
                'message' => 'This complaint already has a resolution awaiting review.',
            ], 422);
        }

        $resolutionId = (string) Str::uuid();
        $uploadedPaths = [];

        try {
            // Upload evidence files to Supabase Storage first.
            foreach ($request->file('evidence', []) ?? [] as $file) {
                $extension = $file->extension() ?: 'bin';

                $path = "resolutions/{$complaint->id}/{$resolutionId}/"
                    . Str::uuid() . ".{$extension}";

                $storage->upload($file, $path);

                $uploadedPaths[] = [
                    'path' => $path,
                    'file' => $file,
                ];
            }

            // Save the resolution and evidence metadata in one transaction.
            $resolution = DB::transaction(function () use ($complaint, $profile, $validated, $resolutionId, $uploadedPaths) {
                // Lock the complaint to prevent simultaneous submissions or reassignment.
                $lockedComplaint = Complaint::whereKey($complaint->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($lockedComplaint->status !== 'in_progress') {
                    abort(422, 'This complaint is no longer in progress.');
                }

                // Recheck the handler's active assignment.
                $currentAssignment = ComplaintAssignment::where(
                    'complaint_id',
                    $lockedComplaint->id
                )
                    ->where('assigned_to', $profile->id)
                    ->whereNull('ended_at')
                    ->lockForUpdate()
                    ->first();

                if (!$currentAssignment) {
                    abort(403, 'You are no longer assigned to this complaint.');
                }

                if ($profile->role === 'Barangay_Head') {
                    if (
                        $currentAssignment->assignment_level !== 'barangay' ||
                        $currentAssignment->barangay_id !== $profile->barangay_id ||
                        $lockedComplaint->resolution_level !== 'barangay'
                    ) {
                        abort(403, 'You are not authorized to submit this resolution.');
                    }
                }

                if ($profile->role === 'Department_Personnel') {
                    if (
                        $currentAssignment->assignment_level !== 'lgu' ||
                        $currentAssignment->department_id !== $profile->department_id ||
                        $lockedComplaint->resolution_level !== 'lgu'
                    ) {
                        abort(403, 'You are not authorized to submit this resolution.');
                    }
                }

                // Recheck for another pending resolution.
                $hasPendingResolution = ComplaintResolution::where(
                    'complaint_id',
                    $lockedComplaint->id
                )
                    ->where('review_status', 'pending_review')
                    ->exists();

                if ($hasPendingResolution) {
                    abort(422, 'This complaint already has a resolution awaiting review.');
                }

                $resolution = ComplaintResolution::create([
                    'id' => $resolutionId,
                    'complaint_id' => $lockedComplaint->id,
                    'submitted_by' => $profile->id,
                    'resolution_description' => $validated['resolution_description'],
                    'review_status' => 'pending_review',
                    'submitted_at' => now(),
                ]);

                // Save metadata for each uploaded evidence file.
                foreach ($uploadedPaths as $uploaded) {
                    $file = $uploaded['file'];

                    ComplaintResolutionAttachment::create([
                        'resolution_id' => $resolution->id,
                        'uploaded_by' => $profile->id,
                        'file_path' => $uploaded['path'],
                        'file_name' => $file->getClientOriginalName(),
                        'mime_type' => $file->getMimeType(),
                        'file_size' => $file->getSize(),
                    ]);
                }

                // Notify all active LGU Staff that a resolution is awaiting review.
                $activeStaff = Profile::where('role', 'LGU-Staff')
                    ->where('is_active', true)
                    ->get();

                foreach ($activeStaff as $staff) {
                    Notification::create([
                        'profile_id' => $staff->id,
                        'complaint_id' => $lockedComplaint->id,
                        'title' => 'Resolution Submitted for Review',
                        'message' => 'A complaint handler has submitted a resolution that requires your review.',
                        'type' => 'resolution_submitted',
                    ]);
                }

                // Complaint remains in_progress while the resolution is reviewed.
                return $resolution;

            });

            return response()->json([
                'message' => 'Resolution submitted successfully and is awaiting LGU-Staff review.',
                'data' => $resolution->load([
                    'submitter',
                    'attachments',
                ]),
            ], 201);

        } catch (Throwable $exception) {
            // Remove files already uploaded if saving the resolution failed.
            foreach ($uploadedPaths as $uploaded) {
                try {
                    $storage->delete($uploaded['path']);
                } catch (Throwable $cleanupException) {
                    Log::warning('Failed to clean up resolution evidence.', [
                        'path' => $uploaded['path'],
                        'error' => $cleanupException->getMessage(),
                    ]);
                }
            }

            throw $exception;
        }
    }

    /**
     * Retrieve resolution submissions awaiting LGU-Staff review.
     */
    public function index(Request $request)
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
            $profile->role !== 'LGU-Staff'
        ) {
            return response()->json([
                'message' => 'Only active LGU-Staff can access the resolution review queue.',
            ], 403);
        }

        $resolutions = ComplaintResolution::where(
            'review_status',
            'pending_review'
        )
            ->with([
                'submitter',
                'attachments',
                'complaint.citizen',
                'complaint.category',
                'complaint.barangay',
                'complaint.activeAssignment.assignee',
            ])
            ->latest('submitted_at')
            ->paginate(10);

        return response()->json([
            'message' => 'Pending resolutions retrieved successfully.',
            'data' => $resolutions->items(),
            'pagination' => [
                'current_page' => $resolutions->currentPage(),
                'last_page' => $resolutions->lastPage(),
                'per_page' => $resolutions->perPage(),
                'total' => $resolutions->total(),
            ],
        ]);
    }

    /**
     * Approve or return a submitted resolution.
     */
    public function review(Request $request, string $resolutionId)
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
            $profile->role !== 'LGU-Staff'
        ) {
            return response()->json([
                'message' => 'Only active LGU-Staff can review resolutions.',
            ], 403);
        }

        $validated = $request->validate([
            'decision' => [
                'required',
                Rule::in(['approved', 'returned']),
            ],
            'review_comment' => [
                'required_if:decision,returned',
                'nullable',
                'string',
                'max:2000',
            ],
        ]);

        $result = DB::transaction(function () use ($resolutionId, $profile, $validated) {
            // Lock the resolution to prevent duplicate reviews.
            $resolution = ComplaintResolution::whereKey($resolutionId)
                ->lockForUpdate()
                ->first();

            if (!$resolution) {
                abort(404, 'Resolution not found.');
            }

            if ($resolution->review_status !== 'pending_review') {
                abort(422, 'This resolution has already been reviewed.');
            }

            // Lock its complaint before changing the complaint status.
            $complaint = Complaint::whereKey($resolution->complaint_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($complaint->status !== 'in_progress') {
                abort(422, 'This complaint is no longer in progress.');
            }

            $oldStatus = $complaint->status;
            $decision = $validated['decision'];
            $reviewComment = $validated['review_comment'] ?? null;

            // Update the resolution review details.
            $resolution->review_status = $decision;
            $resolution->reviewed_by = $profile->id;
            $resolution->review_comment = $reviewComment;
            $resolution->reviewed_at = now();
            $resolution->save();

            if ($decision === 'approved') {
                // Approved resolution means the complaint is resolved.
                $complaint->status = 'resolved';
                $complaint->save();
                $endedAt = now();

                $complaint->assignments()
                    ->whereNull('ended_at')
                    ->update([
                        'ended_at' => $endedAt,
                        'updated_at' => $endedAt,
                    ]);
                ComplaintUpdate::create([
                    'complaint_id' => $complaint->id,
                    'updated_by' => $profile->id,
                    'old_status' => $oldStatus,
                    'new_status' => 'resolved',
                    'comment' => 'Resolution approved by LGU-Staff.'
                        . ($reviewComment ? ' Comment: ' . $reviewComment : ''),
                ]);

                // Notify the handler that the submitted resolution was approved.
                Notification::create([
                    'profile_id' => $resolution->submitted_by,
                    'complaint_id' => $complaint->id,
                    'title' => 'Resolution Approved',
                    'message' => 'Your submitted complaint resolution has been approved by LGU Staff.',
                    'type' => 'resolution_approved',
                ]);

                // Notify the Citizen that the complaint has been resolved.
                if ($complaint->citizen_id) {
                    Notification::create([
                        'profile_id' => $complaint->citizen_id,
                        'complaint_id' => $complaint->id,
                        'title' => 'Complaint Resolved',
                        'message' => 'Your complaint has been resolved after LGU Staff approved the submitted resolution.',
                        'type' => 'complaint_resolved',
                    ]);
                }
            } else {
                // Returned resolution keeps the complaint in progress.
                ComplaintUpdate::create([
                    'complaint_id' => $complaint->id,
                    'updated_by' => $profile->id,
                    'old_status' => $oldStatus,
                    'new_status' => $oldStatus,
                    'comment' => 'Resolution returned by LGU-Staff. Reason: '
                        . $reviewComment,
                ]);

                // Notify the handler that the resolution needs revision.
                Notification::create([
                    'profile_id' => $resolution->submitted_by,
                    'complaint_id' => $complaint->id,
                    'title' => 'Resolution Returned',
                    'message' => 'Your submitted resolution was returned by LGU Staff. Reason: '
                        . ($reviewComment ?: 'Please review and update your submission.'),
                    'type' => 'resolution_returned',
                ]);
            }

            return [
                'resolution' => $resolution->fresh()->load([
                    'submitter',
                    'reviewer',
                    'attachments',
                ]),
                'complaint' => $complaint->fresh(),
            ];
        });

        return response()->json([
            'message' => $validated['decision'] === 'approved'
                ? 'Resolution approved successfully. Complaint marked as resolved.'
                : 'Resolution returned successfully. Complaint remains in progress.',
            'data' => $result,
        ]);
    }
}
