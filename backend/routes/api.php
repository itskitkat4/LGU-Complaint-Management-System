<?php

use App\Http\Controllers\Api\AdminDashboardController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\VerifySupabaseToken;
use App\Http\Controllers\Api\CitizenProfileController;
use App\Http\Controllers\Api\BarangayController;
use App\Http\Controllers\Api\ComplaintCategoryController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\StaffComplaintController;
use App\Http\Controllers\Api\DepartmentComplaintController;
use App\Http\Controllers\Api\ComplaintAttachmentController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\StaffAccountController;
use App\Models\Profile;

//* PUBLIC ROUTES

Route::get('/barangays', [BarangayController::class, 'index']);
Route::get('/complaint-categories', [ComplaintCategoryController::class, 'index']);

//* AUTHENTICATED ROUTES
Route::middleware(VerifySupabaseToken::class)->group(function () {

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
    Route::middleware('role:System Administrator')->group(function () {
        Route::post('/staff-accounts', [StaffAccountController::class, 'store']);
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
    });

    // CITIZEN PROFILE ROUTES
    Route::get('/profile', [CitizenProfileController::class, 'showOrCreate']);
    Route::put('/profile', [CitizenProfileController::class, 'update']);

    //* CITIZEN COMPLAINT ROUTES
    Route::middleware('role:citizen')->group(function () {
        Route::post('/complaints', [ComplaintController::class, 'store']);
        Route::get('/complaints', [ComplaintController::class, 'index']);
    });

    //* BARANGAY HEAD ROUTES
    Route::middleware('role:Barangay_Head')->group(function () {
        Route::get('/barangay/complaints', [ComplaintController::class, 'barangayIndex']);
    });

    //* LGU-STAFF REVIEW ROUTE
    Route::middleware('role:LGU-Staff')->group(function () {
        Route::get('/staff/complaints/history', [StaffComplaintController::class, 'staffHistory']);
        Route::get('/staff/complaints', [StaffComplaintController::class, 'staffIndex']);
        Route::get('/staff/complaints/{complaintId}', [StaffComplaintController::class, 'staffShow']);
        Route::post('/complaints/{complaintId}/review', [StaffComplaintController::class, 'review']);
        Route::get('/staff/complaints/{complaintId}/eligible-assignees', [StaffComplaintController::class, 'eligibleAssignees']);
        Route::get('/staff/escalations', [StaffComplaintController::class, 'escalationIndex']);

        Route::post('/staff/escalations/{escalationId}/review', [
            StaffComplaintController::class,
            'reviewEscalation',
        ]);

        //* // Initial routing and transfer to another handling unit.
        Route::post('/staff/complaints/{complaintId}/route', [StaffComplaintController::class, 'routeComplaint']);
    });

    //* DEPARTMENT HEAD ROUTES
    Route::middleware('role:Department_Head')->group(function () {
        Route::get('/department/complaints',[DepartmentComplaintController::class, 'departmentHeadIndex']);
        // Assign a complaint to personnel within the same department.
        Route::post('/department/complaints/{complaintId}/assign', [DepartmentComplaintController::class, 'assignPersonnel']);
        Route::post('/department/escalations/{escalationId}/outcome',[ComplaintController::class, 'recordEscalationOutcome']);
        Route::get('/department/personnel',[DepartmentComplaintController::class, 'eligiblePersonnel']);
        Route::post('/department/complaints/{complaintId}/assign',[DepartmentComplaintController::class, 'assignPersonnel']);
        Route::post(
        '/department/escalations/{escalationId}/outcome',
        [ComplaintController::class, 'recordEscalationOutcome']
    );
    });

    //* ATTACHMENT ROUTE
    Route::get(
        '/complaint-attachments/{attachmentId}/signed-url',
        [ComplaintAttachmentController::class, 'signedUrl']
    );

    //* ESCALATION ROUTES
    Route::middleware('role:Barangay_Head,Department_Head')->group(function () {
        Route::post('/complaints/{complaintId}/escalations', [ComplaintController::class, 'requestEscalation']);
    });
    Route::middleware('role:Department_Personnel')->group(function () {
        Route::get(
            '/department/personnel/complaints',
            [DepartmentComplaintController::class, 'personnelIndex']
        );
    });
});

