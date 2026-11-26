<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AdminComplaintController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AIComplaintController;
use App\Http\Controllers\Api\BarangayController;
use App\Http\Controllers\Api\CitizenProfileController;
use App\Http\Controllers\Api\ComplaintAttachmentController;
use App\Http\Controllers\Api\ComplaintCategoryController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\ComplaintResolutionController;
use App\Http\Controllers\Api\DashboardSummaryController;
use App\Http\Controllers\Api\DepartmentComplaintController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\StaffAccountController;
use App\Http\Controllers\Api\StaffComplaintController;
use App\Http\Controllers\Api\StaffReportController;

use App\Http\Middleware\RedactAnonymousComplaintIdentity;
use App\Http\Middleware\VerifySupabaseToken;

use App\Models\Profile;

//* PUBLIC ROUTES

Route::get('/barangays', [BarangayController::class, 'index']);
Route::get('/complaint-categories', [ComplaintCategoryController::class, 'index']);

//* AUTHENTICATED ROUTES
Route::middleware([VerifySupabaseToken::class, RedactAnonymousComplaintIdentity::class, 'throttle:api'])->group(function () {

    Route::get('/auth/me', function (Request $request) {
        $user = $request->attributes->get('supabase_user');

        return response()->json([
            'message' => 'Authenticated successfully.',
            'user' => [
                'id' => $user['id'] ?? null,
                'email' => $user['email'] ?? null,
            ],
        ]);
    });

    Route::get('/auth/profile', function (Request $request) {
        $user = $request->attributes->get('supabase_user');
        $profile = Profile::find($user['id']);

        if (!$profile) {
            return response()->json([
                'message' => 'User Profile Not Found',
            ], 404);
        }

        return response()->json([
            'message' => 'Profile Retrieved Successfully',
            'profile' => $profile,
        ]);
    });

    //* STAFF ACCOUNT ROUTES
    Route::post('/staff-accounts/complete-password-setup', [StaffAccountController::class, 'completePasswordSetup'])
        ->name('staff-accounts.complete-password-setup');

    Route::middleware('role:System Administrator')->group(function () {
        Route::post('/staff-accounts', [StaffAccountController::class, 'store'])->middleware('throttle:10,1');
        Route::get('/staff-accounts', [StaffAccountController::class, 'index']);
        Route::patch('/staff-accounts/{staffId}/deactivate', [StaffAccountController::class, 'deactivate',]);
    });

    //* DEPARTMENT ROUTES
    Route::middleware('role:System Administrator,LGU-Staff,Department_Head,Department_Personnel,Barangay_Head')
        ->get('/departments', [DepartmentController::class, 'index']);

    Route::middleware('role:System Administrator')->group(function () {
        Route::post('/departments', [DepartmentController::class, 'store']);
        Route::put('/departments/{id}', [DepartmentController::class, 'update']);
        Route::delete('/departments/{id}', [DepartmentController::class, 'delete']);
        Route::get('/admin/dashboard-summary', [AdminDashboardController::class, 'summary']);
        Route::get('/admin/complaints', [AdminComplaintController::class, 'index']);
        Route::get('/admin/complaints/{complaintId}', [AdminComplaintController::class, 'show']);
    });

    //* CITIZEN PROFILE ROUTES
    Route::get('/profile', [CitizenProfileController::class, 'showOrCreate']);
    Route::put('/profile', [CitizenProfileController::class, 'update']);

    //* CITIZEN COMPLAINT ROUTES
    Route::middleware('role:citizen')->group(function () {
        Route::post('/complaints', [ComplaintController::class, 'store'])->middleware('throttle:10,1');
        Route::get('/complaints', [ComplaintController::class, 'index']);
        Route::get('/complaints/{complaintId}', [ComplaintController::class, 'show']);
    Route::post('/citizen/complaint-assistant/chat', [AIComplaintController::class, 'chat'])
        ->middleware('throttle:ai-complaint')
        // Use the stricter user-keyed limiter instead of the shared IP API limit.
        ->withoutMiddleware('throttle:api');
  });

    //* BARANGAY HEAD ROUTES
    Route::middleware('role:Barangay_Head')->group(function () {
        Route::get('/barangay/dashboard-summary', [DashboardSummaryController::class, 'barangaySummary']);
        Route::get('/barangay/complaints/history', [ComplaintController::class, 'barangayHistory']);
        Route::get('/barangay/complaints', [ComplaintController::class, 'barangayIndex']);
        Route::post('/barangay/complaints/{complaintId}/start', [ComplaintController::class, 'startBarangayWork']);
    });

    //* LGU-STAFF REVIEW ROUTE
    Route::middleware('role:LGU-Staff')->group(function () {
        Route::get('/staff/dashboard-summary', [DashboardSummaryController::class, 'staffSummary']);
        Route::get('/staff/complaints/history', [StaffComplaintController::class, 'staffHistory']);
        Route::get('/staff/complaints', [StaffComplaintController::class, 'staffIndex']);
        Route::get('/staff/complaints/{complaintId}', [StaffComplaintController::class, 'staffShow']);
        Route::post('/complaints/{complaintId}/review', [StaffComplaintController::class, 'review']);
        Route::get('/staff/complaints/{complaintId}/eligible-assignees', [StaffComplaintController::class, 'eligibleAssignees']);
        Route::get('/staff/escalations', [StaffComplaintController::class, 'escalationIndex']);
        Route::get('/staff/resolutions', [ComplaintResolutionController::class, 'index']);
        Route::post('/staff/resolutions/{resolutionId}/review', [ComplaintResolutionController::class, 'review']);
        Route::post('/staff/escalations/{escalationId}/review', [StaffComplaintController::class, 'reviewEscalation',]);
        //* Initial routing and transfer to another handling unit.
        Route::post('/staff/complaints/{complaintId}/route', [StaffComplaintController::class, 'routeComplaint']);
        Route::get('/staff/reports/summary', [StaffReportController::class, 'summary']);
        Route::post('/staff/reports', [StaffReportController::class, 'store']);


        Route::post('/staff/reports/{report}/pdf', [StaffReportController::class, 'uploadPdf']);
        Route::get('/staff/reports/{report}/pdf/signed-url', [StaffReportController::class, 'signedPdfUrl']);
    });

    //* DEPARTMENT HEAD ROUTES
    Route::middleware('role:Department_Head')->group(function () {
        Route::get('/department/complaints', [DepartmentComplaintController::class, 'departmentHeadIndex']);
        Route::get('/department/monitoring', [DepartmentComplaintController::class, 'monitoringIndex']);
        // Assign a complaint to personnel within the same department.
        Route::post('/department/complaints/{complaintId}/assign', [DepartmentComplaintController::class, 'assignPersonnel']);
        Route::post('/department/escalations/{escalationId}/outcome', [ComplaintController::class, 'recordEscalationOutcome']);
        Route::get('/department/personnel', [DepartmentComplaintController::class, 'eligiblePersonnel']);
    });

    //* ATTACHMENT ROUTE
    Route::get('/complaint-attachments/{attachmentId}/signed-url', [ComplaintAttachmentController::class, 'signedUrl']);

    //* ESCALATION ROUTES
    Route::middleware('role:Barangay_Head,Department_Head')->group(function () {
        Route::post('/complaints/{complaintId}/escalations', [ComplaintController::class, 'requestEscalation']);
    });
    Route::middleware('role:Department_Personnel')->group(function () {
        Route::get('/department/personnel/dashboard-summary', [DashboardSummaryController::class, 'personnelSummary']);
        Route::get('/department/personnel/complaints', [DepartmentComplaintController::class, 'personnelIndex']);
        Route::get('/department/personnel/complaints/{complaintId}', [DepartmentComplaintController::class, 'personnelShow']);
        Route::post('/department/personnel/complaints/{complaintId}/start', [DepartmentComplaintController::class, 'startWork']);
    });
    //* RESOLUTION SUBMISSION ROUTES
    Route::middleware('role:Barangay_Head,Department_Personnel')->group(function () {
        Route::post('/complaints/{complaintId}/resolutions', [ComplaintResolutionController::class, 'store']);
    });

    //* Feedback Route

    Route::get('/feedback', [FeedbackController::class, 'index']);
    Route::get('/feedback/eligible-complaints', [FeedbackController::class, 'eligibleComplaints']);
    Route::post('/complaints/{complaint_id}/feedback', [FeedbackController::class, 'store']);

    //* Notification Routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification_id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});
