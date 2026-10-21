<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintAttachment extends Model
{
    use HasUuids;

    protected $table = 'complaint_attachments';

    protected $fillable = [
        'complaint_id',
        'uploaded_by',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'resolution_id',
    ];

    public function complaint(): BelongsTo {
        return $this->belongsTo(Complaint::class, 'complaint_id');
    }

    public function uploader(): BelongsTo{
        return $this->belongsTo(Profile::class, 'uploaded_by');
    }
    public $timestamps = false;
}
