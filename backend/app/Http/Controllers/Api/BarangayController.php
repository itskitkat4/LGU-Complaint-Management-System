<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barangay;
use Illuminate\Http\Request;

class BarangayController extends Controller
{
    public function index() {
        $barangays = Barangay::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code']);
        return response()->json([
            'message' => 'Barangays retrieved successfully',
            'barangays' => $barangays,
        ]);
    }
}
