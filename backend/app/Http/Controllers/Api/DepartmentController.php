<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Department;
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
        $department = Department::findOrFail($id);

        $department->delete();

        return response()->json([
            'message' => 'Department deleted successfully',
        ]);
    }
}
