
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\VerifySupabaseToken;
use App\Http\Controllers\Api\CitizenProfileController;
use App\Http\Controllers\Api\BarangayController;
use App\Http\Controllers\Api\ComplaintCategoryController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\ComplaintAttachmentController;

Route::middleware(VerifySupabaseToken::class)->group(function () {
Route::get('complaint-attachments/{attachmentId}/signed-url', [ComplaintAttachmentController::class, 'signedUrl']);


    // Test the authenticated Supabase user.
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

    // Retrieve or create the citizen profile.
    Route::get('/profile', [CitizenProfileController::class, 'showOrCreate']);
    Route::put('/profile', [CitizenProfileController::class, 'update']);
    Route::post('/complaints', [ComplaintController::class, 'store']);
});

Route::get('/barangays', [BarangayController::class, 'index']);
Route::get('/complaint-categories', [ComplaintCategoryController::class, 'index']);
