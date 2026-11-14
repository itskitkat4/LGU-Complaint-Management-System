<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ComplaintAssignment extends Model
{
    use HasUuids;

    protected $table = 'complaint_assignments';

    protected $fillable = [
        'complaint_id',
        'assigned_to',
        'assigned_by',
        'assignment_level',
        'barangay_id',
        'department_id',
        'notes',
        'assigned_at',
        'ended_at',
    ];
 protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'assigned_to');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'assigned_by');
    }

    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class, 'barangay_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }
}
