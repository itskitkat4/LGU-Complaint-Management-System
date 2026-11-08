<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintEscalation extends Model
{
    use HasUuids;

    protected $table = 'complaint_escalations';

    protected $fillable = [
        'complaint_id',
        'escalation_type',
        'requested_by',
        'origin_barangay_id',
        'origin_department_id',
        'destination_department_id',
        'higher_authority_office',
        'reason',
        'status',
        'reviewed_by',
        'review_comment',
        'reviewed_at',
        'outcome_notes',
        'outcome_recorded_by',
        'outcome_recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
            'outcome_recorded_at' => 'datetime',
        ];
    }

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'requested_by');
    }

    public function originBarangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class, 'origin_barangay_id');
    }

    public function originDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'origin_department_id');
    }

    public function destinationDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'destination_department_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'reviewed_by');
    }

    public function outcomeRecorder(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'outcome_recorded_by');
    }
}