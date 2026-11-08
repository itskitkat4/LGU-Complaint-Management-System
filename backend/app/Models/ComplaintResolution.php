<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ComplaintResolution extends Model
{
    use HasUuids;

    protected $table = 'complaint_resolutions';

    protected $fillable = [
        'complaint_id',
        'submitted_by',
        'resolution_description',
        'review_status',
        'reviewed_by',
        'review_comment',
        'submitted_at',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function complaint()
    {
        return $this->belongsTo(Complaint::class);
    }

    public function submitter()
    {
        return $this->belongsTo(Profile::class, 'submitted_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(Profile::class, 'reviewed_by');
    }

    public function attachments()
    {
        return $this->hasMany(ComplaintAttachment::class, 'resolution_id');
    }
}