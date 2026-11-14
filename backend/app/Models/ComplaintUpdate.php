<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintUpdate extends Model
{
    use HasUuids;

    protected $table = 'complaint_updates';

    protected $fillable = [
        'complaint_id',
        'updated_by',
        'old_status',
        'new_status',
        'comment',
    ];
    public $timestamps = false;

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'updated_by');
    }
}
