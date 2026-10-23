<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Complaint extends Model
{
    use HasUuids;

    protected $table = 'complaints';


    protected $fillable = [
        'id',
        'citizen_id',
        'category_id',
        'barangay_id',

        'title',
        'description',
        'priority',
        'status',
        'resolution_level',
        'rejected_reason'
    ];

    public function casts(): array {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime'
        ];
    }
    public function citizen(): BelongsTo {
        return $this->belongsTo(Profile::class, 'citizen_id');
    }


    public function category(): BelongsTo{
        return $this->belongsTo(ComplaintCategory::class, 'category_id');
    }

    public function barangay(): BelongsTo{
        return $this->belongsTo(Barangay::class, 'barangay_id');
    }

    public function attachments(): HasMany{
        return $this->hasMany(ComplaintAttachment::class, 'complaint_id');
    }

    public function updates(): HasMany{
        return $this->hasMany(ComplaintUpdate::class, 'complaint_id');
    }
}
