
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\VerifySupabaseToken;
use App\Http\Controllers\Api\CitizenProfileController;
use App\Http\Controllers\Api\BarangayController;
use App\Http\Controllers\Api\ComplaintCategoryController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\ComplaintAttachmentController;
use App\Http\Controllers\Api\DepartmentController;
use App\Models\Profile;

// PUBLIC ROUTES
Route::get('/barangays', [BarangayController::class, 'index']);
Route::get('/complaint-categories', [ComplaintCategoryController::class, 'index']);

// AUTHENTICATED ROUTES
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

    // DEPARTMENT ROUTES
    Route::middleware('role:System Administrator,LGU-Staff,Department_Head,Department_Personnel')
        ->get('/departments', [DepartmentController::class, 'index']);

    Route::middleware('role:System Administrator')->group(function () {
        Route::post('/departments', [DepartmentController::class, 'store']);
        Route::put('/departments/{id}', [DepartmentController::class, 'update']);
        Route::delete('/departments/{id}', [DepartmentController::class, 'delete']);
    });

    // CITIZEN PROFILE ROUTES
    Route::get('/profile', [CitizenProfileController::class, 'showOrCreate']);
    Route::put('/profile', [CitizenProfileController::class, 'update']);

    // CITIZEN COMPLAINT ROUTES
    Route::middleware('role:citizen')->group(function () {
        Route::post('/complaints', [ComplaintController::class, 'store']);
        Route::get('/complaints', [ComplaintController::class, 'index']);
    });

    // LGU-STAFF REVIEW ROUTE
    Route::middleware('role:LGU-Staff')->group(function () {
        Route::post('/complaints/{complaintId}/review', [ComplaintController::class, 'review']);
    });

    // ATTACHMENT ROUTE
    Route::get(
        '/complaint-attachments/{attachmentId}/signed-url',
        [ComplaintAttachmentController::class, 'signedUrl']
    );
});
