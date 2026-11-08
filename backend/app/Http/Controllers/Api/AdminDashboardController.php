<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barangay;
use App\Models\Department;
use App\Models\Profile;
use App\Models\Complaint;

class AdminDashboardController extends Controller
{
    public function summary() {
        return response()->json([
            'users' => Profile::count(),
            'complaints' => Complaint::count(),
            'barangays' => Barangay::count(),
            'departments' => Department::count(),
        ]);
    }
}
