<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasUuids;

    protected $table = 'notifications';

    protected $fillable = [
        'profile_id',
        'complaint_id',
        'title',
        'message',
        'type',
        'is_read',
        'read_at'
    ];

    protected $casts =  [
        'is_read' => 'boolean',
        'read_at' => 'datetime'
    ];

    public function profile (): BelongsTo {
        return $this->belongsTo(Profile::class, 'profile_id');
    }

    public function complaint (): BelongsTo {
        return $this->belongsTo(Complaint::class, 'complaint_id');
    }
}
