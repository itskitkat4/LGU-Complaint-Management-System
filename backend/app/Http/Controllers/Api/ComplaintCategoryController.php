<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ComplaintCategory;
class ComplaintCategoryController extends Controller
{
    public function index() {
        $categories = ComplaintCategory::query()
        ->where('is_active', true)
        ->orderBy('name')
        ->get(['id', 'name', 'description', 'is_active']);


        return response()->json([
            'message' => 'Complaint categories retrieved successfully',
            'categories' => $categories,
        ]);
    }
}
