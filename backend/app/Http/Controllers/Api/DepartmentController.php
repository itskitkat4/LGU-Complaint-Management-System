<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComplaintAssignment;
use App\Models\ComplaintEscalation;
use App\Models\Department;
use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DepartmentController extends Controller
{
    //GET all departments
    public function index() {
        $departments = Department::query()
                ->orderBy('name')
                ->get(['id', 'name', 'description']);
        return response()->json([
            'message' => 'Departments retrieved successfully',
            'departments' => $departments,
        ]);
    }

    //POST create a new department
    public function store(Request $request) {
        $validatedData = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:departments,name'],
            'description' => 'nullable|string|max:255',
        ]);
        $department = Department::create($validatedData);
        return response()->json([
            'message' => 'Department created successfully',
            'department' => $department,
        ], 201);
    }
    //PUT update an existing department
    public function update(Request $request, $id) {
        $department = Department::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('departments')->ignore($department->id)],
            'description' => ['nullable', 'string', 'max:255'],
        ]);
        $department->update($validated);
        return response()->json([
            'message' => 'Department updated successfully',
            'department' => $department,
        ]);
    }
    //DELETE delete a department
    public function delete($id) {
        return DB::transaction(function () use ($id) {
            $department = Department::whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            $hasStaff = Profile::where('department_id', $department->id)->exists();
            $hasComplaintAssignments = ComplaintAssignment::where(
                'department_id',
                $department->id
            )->exists();
            $hasComplaintEscalations = ComplaintEscalation::where('origin_department_id', $department->id)
                ->orWhere('destination_department_id', $department->id)
                ->exists();
            $blockingReasons = [];

            if ($hasStaff) {
                $blockingReasons[] = 'staff members are assigned to it';
            }

            if ($hasComplaintAssignments || $hasComplaintEscalations) {
                $blockingReasons[] = 'existing complaints or complaint escalation records are associated with it';
            }

            if ($blockingReasons !== []) {
                return response()->json([
                    'message' => 'Department cannot be deleted because ' . implode(' and ', $blockingReasons) . '.',
                ], 409);
            }

            $department->delete();

            return response()->json([
                'message' => 'Department deleted successfully',
            ]);
        });
    }
}
