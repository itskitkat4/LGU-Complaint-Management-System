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
use App\Models\ComplaintEscalation;
use App\Models\ComplaintAssignment;
use Illuminate\Validation\Rule;
use App\Models\Notification;
use Throwable;

class ComplaintController extends Controller
{

    //* Display complaints currently assigned to the authenticated Barangay Head.
    public function barangayIndex(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json(['message' => 'Authentication is required.'], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || !$profile->is_active || $profile->role !== 'Barangay_Head') {
            return response()->json(['message' => 'Only active Barangay Heads can access this complaint queue.'], 403);
        }

        if (!$profile->barangay_id) {
            return response()->json(['message' => 'Your account has no assigned barangay.'], 422);
        }

        $complaints = Complaint::query()
            ->whereHas('activeAssignment', function ($query) use ($profile) {
                $query->where('assigned_to', $profile->id)
                    ->where('assignment_level', 'barangay')
                    ->where('barangay_id', $profile->barangay_id)
                    ->whereNull('ended_at');
            })
            ->with([
                'category:id,name',
                'barangay:id,name',
                'escalations' => function ($query) {
                    $query->where('escalation_type', 'barangay_to_department')
                        ->with('destinationDepartment:id,name')
                        ->latest();
                },
            ])
            ->latest()
            ->paginate(10);

        return response()->json([
            'message' => 'Barangay complaints retrieved successfully.',
            'data' => $complaints->items(),
            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'last_page' => $complaints->lastPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
            ],
        ]);
    }

    //* Display all complaints associated with the authenticated head's barangay.
    public function barangayHistory(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json(['message' => 'Authentication is required.'], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || !$profile->is_active || $profile->role !== 'Barangay_Head') {
            return response()->json(['message' => 'Only active Barangay Heads can access this complaint history.'], 403);
        }

        if (!$profile->barangay_id) {
            return response()->json([
                'message' => 'Your account has no assigned barangay.',
            ], 422);
        }

        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in([
                    'submitted',
                    'under_review',
                    'accepted',
                    'declined',
                    'assigned',
                    'in_progress',
                    'resolved',
                ]),
            ],
        ]);

        $complaints = Complaint::query()
            ->where('barangay_id', $profile->barangay_id)
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status)
            )
            ->with([
                'category:id,name',
                'barangay:id,name',
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(10);

        return response()->json([
            'message' => 'Barangay complaint history retrieved successfully.',
            'data' => $complaints->items(),
            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'last_page' => $complaints->lastPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
            ],
        ]);
    }

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

        $citizenComplaints = Complaint::query()
            ->where('citizen_id', $profile->id);

        $statusCounts = (clone $citizenComplaints)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $complaints = (clone $citizenComplaints)
            ->with(
                'category:id,name',
                'barangay:id,name',
                'attachments:id,complaint_id,file_name,mime_type,file_size',
            )
            ->orderByDesc('created_at')
            ->paginate(10);

        $statistics = [
            'total' => (int) $complaints->total(),
            'pre_assignment' => (int) ($statusCounts->get('submitted', 0)
                + $statusCounts->get('under_review', 0)
                + $statusCounts->get('accepted', 0)),
            'in_progress' => (int) ($statusCounts->get('assigned', 0)
                + $statusCounts->get('in_progress', 0)),
            'resolved' => (int) $statusCounts->get('resolved', 0),
        ];

        return response()->json([
            'message' => 'Complaint history is retrieve',
            'data' => $complaints->items(),
            'statistics' => $statistics,

            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'last_page' => $complaints->lastPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
            ]
        ]);
    }
    //* Display a single complaint belonging to the authenticated citizen.
    public function show(Request $request, string $complaintId)
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
                'message' => 'Only citizens can access their complaint details.',
            ], 403);
        }

        $complaint = Complaint::query()
            ->where('id', $complaintId)
            ->where('citizen_id', $profile->id)
            ->with([
                'category:id,name',
                'barangay:id,name',
                'updates' => function ($query) {
                    $query->orderBy('created_at', 'asc');
                },
                'attachments:id,complaint_id,file_name,mime_type,file_size',
                'resolutions' => function ($query) {
                    $query->select([
                            'id',
                            'complaint_id',
                            'submitted_by',
                            'resolution_description',
                            'completed_at',
                            'review_status',
                            'reviewed_by',
                            'submitted_at',
                            'reviewed_at',
                        ])
                        ->where('review_status', 'approved')
                        ->with([
                            'attachments:id,resolution_id,file_name,mime_type,file_size,evidence_type',
                            'reviewer:id,full_name,email',
                        ])
                        ->orderByDesc('reviewed_at');
                },
            ])
            ->first();

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found.',
            ], 404);
        }

        return response()->json([
            'message' => 'Complaint details retrieved successfully.',
            'complaint' => $complaint,
        ]);
    }

    //* Submit a complaint and store its supporting attachments.
    public function store(Request $request, SupabaseStorageService $storage)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id']) || empty($user['email'])) {
            return response()->json([
                'message' => 'Authenticated user information is missing.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || $profile->role !== 'citizen') {
            return response()->json([
                'message' => 'Only authorized citizens can submit complaints.',
            ], 403);
        }

        if (empty($profile->barangay_id)) {
            return response()->json([
                'message' => 'Please complete your profile and select your barangay.',
            ], 422);
        }

        $validated = $request->validate([
            'barangay_id' => [
                'required',
                'uuid',
                Rule::exists('barangays', 'id'),
            ],

            'category_id' => [
                'required',
                'uuid',
                Rule::exists('complaint_categories', 'id')
                    ->where('is_active', true),
            ],

            'title' => ['required', 'string', 'max:255'],

            'description' => ['required', 'string', 'min:10', 'max:5000'],

            'is_anonymous' => ['sometimes', 'boolean'],

            'attachments' => ['sometimes', 'array', 'max:5'],

            'attachments.*' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],
        ]);

        $files = $request->file('attachments', []);

        $complaintId = (string) Str::uuid();

        $uploadedFiles = [];

        try {
            foreach ($files as $file) {
                $extension = strtolower(
                    $file->guessExtension() ?: 'jpg'
                );

                $path = sprintf(
                    'complaints/%s/%s.%s',
                    $complaintId,
                    Str::uuid(),
                    $extension
                );

                $storage->upload($file, $path);

                $uploadedFiles[] = [
                    'path' => $path,
                    'file_name' => 'evidence.' . $extension,
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                ];
            }
        } catch (Throwable $exception) {

            $this->cleanupUploadedFiles($storage, $uploadedFiles);

            Log::error('Complaint attachment upload failed.', [
                'complaint_id' => $complaintId,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Attachment upload failed. Please try again.',
            ], 502);
        }

        try {
            $complaint = DB::transaction(function () use ($profile, $validated, $uploadedFiles, $complaintId) {
                $complaint = new Complaint([
                    'id' => $complaintId,
                    'citizen_id' => $profile->id,
                    'category_id' => $validated['category_id'],
                    'barangay_id' => $validated['barangay_id'],
                    'title' => $validated['title'],
                    'description' => $validated['description'],
                    'priority' => 'medium',
                    'status' => 'submitted',
                ]);
                $complaint->is_anonymous = (bool) ($validated['is_anonymous'] ?? false);
                $complaint->save();

                Notification::create([
                    'profile_id' => $profile->id,
                    'complaint_id' => $complaint->id,
                    'title' => 'Complaint Submitted',
                    'message' => 'Your complaint has been successfully submitted. You can now track its progress.',
                    'type' => 'complaint_submitted',
                    'is_read' => false,
                ]);
                ComplaintUpdate::create([
                    'complaint_id' => $complaint->id,
                    'updated_by' => $profile->id,
                    'old_status' => null,
                    'new_status' => 'submitted',
                    'comment' => 'Complaint submitted by citizen.',
                ]);

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

                return $complaint->load('attachments');
            });
        } catch (Throwable $exception) {

            $this->cleanupUploadedFiles($storage, $uploadedFiles);

            Log::error('Complaint database operation failed.', [
                'complaint_id' => $complaintId,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Unable to save the complaint. Please try again.',
            ], 500);
        }

        return response()->json([
            'message' => 'Complaint submitted successfully.',
            'complaint' => $complaint,
        ], 201);
    }

    //* Submit a complaint escalation request.
    public function requestEscalation(Request $request, string $complaintId)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (
            !$profile ||
            !$profile->is_active ||
            !in_array($profile->role, ['Barangay_Head', 'Department_Head'], true)
        ) {
            return response()->json([
                'message' => 'Only Barangay Head or Department Head can request escalation.',
            ], 403);
        }

        $complaint = Complaint::find($complaintId);

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found.',
            ], 404);
        }

        if (!in_array($complaint->status, ['assigned', 'in_progress'], true)) {
            return response()->json([
                'message' => 'Only assigned or in-progress complaints can be escalated.',
            ], 422);
        }

        $activeAssignment = ComplaintAssignment::where('complaint_id', $complaint->id)
            ->whereNull('ended_at')
            ->latest('assigned_at')
            ->first();

        if (!$activeAssignment) {
            return response()->json([
                'message' => 'This complaint has no active assignment.',
            ], 422);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $reason = trim($validated['reason']);

        if (mb_strlen($reason) < 10) {
            return response()->json([
                'message' => 'The escalation reason must contain at least 10 characters.',
            ], 422);
        }

        if ($profile->role === 'Barangay_Head') {
            if (
                $activeAssignment->assignment_level !== 'barangay' ||
                $activeAssignment->barangay_id !== $profile->barangay_id
            ) {
                return response()->json([
                    'message' => 'You are not authorized to escalate this complaint.',
                ], 403);
            }

            $destination = $request->validate([
                'destination_department_id' => [
                    'required',
                    'uuid',
                    Rule::exists('departments', 'id'),
                ],
            ]);

            $hasActiveDepartmentHead = Profile::where('role', 'Department_Head')
                ->where('department_id', $destination['destination_department_id'])
                ->where('is_active', true)
                ->exists();

            if (!$hasActiveDepartmentHead) {
                return response()->json([
                    'message' => 'The selected department has no active Department Head to receive this request.',
                ], 422);
            }

            $escalation = ComplaintEscalation::create([
                'complaint_id' => $complaint->id,
                'escalation_type' => 'barangay_to_department',
                'requested_by' => $profile->id,
                'origin_barangay_id' => $profile->barangay_id,
                'destination_department_id' => $destination['destination_department_id'],
                'reason' => $reason,
                'status' => 'pending',
            ]);
        } else {
            if (
                !$profile->department_id ||
                $activeAssignment->assignment_level !== 'lgu' ||
                $activeAssignment->department_id !== $profile->department_id
            ) {
                return response()->json([
                    'message' => 'You are not authorized to escalate this complaint.',
                ], 403);
            }

            $authority = $request->validate([
                'higher_authority_office' => ['required', 'string', 'max:255'],
            ]);

            $office = trim($authority['higher_authority_office']);

            if ($office === '') {
                return response()->json([
                    'message' => 'Higher authority office is required.',
                ], 422);
            }

            $hasPendingExternalEscalation = ComplaintEscalation::where('complaint_id', $complaint->id)
                ->where('escalation_type', 'department_to_higher_authority')
                ->where('status', 'pending')
                ->exists();

            if ($hasPendingExternalEscalation) {
                return response()->json([
                    'message' => 'This complaint already has a pending external escalation.',
                ], 422);
            }

            $escalation = ComplaintEscalation::create([
                'complaint_id' => $complaint->id,
                'escalation_type' => 'department_to_higher_authority',
                'requested_by' => $profile->id,
                'origin_department_id' => $profile->department_id,
                'higher_authority_office' => $office,
                'reason' => $reason,
                'status' => 'pending',
            ]);
        }

        return response()->json([
            'message' => 'Escalation request submitted successfully.',
            'escalation' => $escalation->load([
                'requester',
                'originBarangay',
                'originDepartment',
                'destinationDepartment',
            ]),
        ], 201);
    }

    //* Remove uploaded files when saving the complaint fails.
    private function cleanupUploadedFiles(
        SupabaseStorageService $storage,
        array $uploadedFiles
    ): void {

        foreach ($uploadedFiles as $uploadedFile) {
            try {
                $storage->delete($uploadedFile['path']);
            } catch (Throwable $exception) {
                Log::error('Failed to clean up a complaint attachment.', [
                    'path' => $uploadedFile['path'],
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }
    //* Record the outcome of an escalation sent to a higher authority.
    public function recordEscalationOutcome(Request $request, string $escalationId)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || !$profile->is_active || $profile->role !== 'Department_Head') {
            return response()->json([
                'message' => 'Only active Department Heads can record external escalation outcomes.',
            ], 403);
        }

        $validated = $request->validate([
            'outcome_notes' => [
                'required',
                'string',
                'min:10',
                'max:2000',
            ],
        ]);

        $escalation = ComplaintEscalation::find($escalationId);

        if (!$escalation) {
            return response()->json([
                'message' => 'Escalation request not found.',
            ], 404);
        }

        if (
            $escalation->escalation_type !== 'department_to_higher_authority' ||
            $escalation->status !== 'pending'
        ) {
            return response()->json([
                'message' => 'This external escalation cannot be updated.',
            ], 422);
        }

        if (
            !$profile->department_id ||
            $escalation->origin_department_id !== $profile->department_id
        ) {
            return response()->json([
                'message' => 'You are not authorized to record the outcome of this department escalation.',
            ], 403);
        }

        $updatedEscalation = DB::transaction(function () use ($escalation, $profile, $validated) {
            $lockedEscalation = ComplaintEscalation::whereKey($escalation->id)
                ->lockForUpdate()
                ->first();

            if (!$lockedEscalation || $lockedEscalation->status !== 'pending') {
                return null;
            }

            $lockedEscalation->update([
                'status' => 'completed',
                'outcome_notes' => trim($validated['outcome_notes']),
                'outcome_recorded_by' => $profile->id,
                'outcome_recorded_at' => now(),
            ]);

            return $lockedEscalation->fresh();
        });

        if (!$updatedEscalation) {
            return response()->json([
                'message' => 'This escalation outcome has already been recorded.',
            ], 422);
        }

        return response()->json([
            'message' => 'External escalation outcome recorded successfully.',
            'escalation' => $updatedEscalation,
        ]);
    }
    public function startBarangayWork(Request $request, string $complaintId)
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
            $profile->role !== 'Barangay_Head'
        ) {
            return response()->json([
                'message' => 'Only active Barangay Heads can start complaint work.',
            ], 403);
        }

        if (!$profile->barangay_id) {
            return response()->json([
                'message' => 'Your account has no assigned barangay.',
            ], 422);
        }

        $complaint = Complaint::find($complaintId);

        if (!$complaint) {
            return response()->json([
                'message' => 'Complaint not found.',
            ], 404);
        }

        if (
            $complaint->resolution_level !== 'barangay' ||
            $complaint->barangay_id !== $profile->barangay_id
        ) {
            return response()->json([
                'message' => 'You can only handle complaints assigned to your barangay.',
            ], 403);
        }

        $assignment = ComplaintAssignment::where('complaint_id', $complaint->id)
            ->where('assigned_to', $profile->id)
            ->where('assignment_level', 'barangay')
            ->where('barangay_id', $profile->barangay_id)
            ->whereNull('ended_at')
            ->first();

        if (!$assignment) {
            return response()->json([
                'message' => 'This complaint is not currently assigned to you.',
            ], 403);
        }

        if ($complaint->status !== 'assigned') {
            return response()->json([
                'message' => 'Only assigned complaints can be started.',
            ], 422);
        }

        DB::transaction(function () use ($complaint, $profile) {
            $lockedComplaint = Complaint::whereKey($complaint->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedComplaint->status !== 'assigned') {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(
                    response()->json([
                        'message' => 'The complaint has already been started or its status changed.',
                    ], 422)
                );
            }

            $activeAssignment = ComplaintAssignment::where(
                'complaint_id',
                $lockedComplaint->id
            )
                ->where('assigned_to', $profile->id)
                ->where('assignment_level', 'barangay')
                ->where('barangay_id', $profile->barangay_id)
                ->whereNull('ended_at')
                ->lockForUpdate()
                ->first();

            if (!$activeAssignment) {
                throw new \Illuminate\Http\Exceptions\HttpResponseException(
                    response()->json([
                        'message' => 'You are no longer assigned to this complaint.',
                    ], 403)
                );
            }

            $lockedComplaint->status = 'in_progress';
            $lockedComplaint->save();

            ComplaintUpdate::create([
                'complaint_id' => $lockedComplaint->id,
                'updated_by' => $profile->id,
                'old_status' => 'assigned',
                'new_status' => 'in_progress',
                'comment' => 'Barangay Head started working on the complaint.',
            ]);
        });

        return response()->json([
            'message' => 'Complaint work started successfully.',
            'data' => $complaint->fresh(),
        ]);
    }
}
