<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ComplaintResolution extends Model
{
    use HasUuids;

    protected $table = 'complaint_resolutions';

    protected $fillable = [
        'id',
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

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'submitted_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'reviewed_by');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ComplaintResolutionAttachment::class, 'resolution_id');
    }
}
