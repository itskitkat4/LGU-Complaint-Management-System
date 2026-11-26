<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintResolutionAttachment extends Model
{
    use HasUuids;

    protected $table = 'complaint_resolution_attachments';

    protected $fillable = [
        'resolution_id',
        'uploaded_by',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'evidence_type',
    ];

    public $timestamps = false;

    public function resolution(): BelongsTo
    {
        return $this->belongsTo(ComplaintResolution::class, 'resolution_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'uploaded_by');
    }
}
