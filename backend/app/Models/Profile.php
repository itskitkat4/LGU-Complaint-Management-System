<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    //Laravel define profile table to be used in the model
    protected $table = 'profiles';


    //columns that can be mass assigned
    protected $fillable = [
        'id',
        'full_name',
        'email',
        'role',
        'barangay_id',
        'department_id',    
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Supabase provides UUIDs, so the ID is not auto-incrementing.
    public $incrementing = false;


    // The primary key is stored as a string (UUID).
    protected $keyType = 'string';

    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class, 'barangay_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class, 'citizen_id');
    }

    public function feedback(): HasMany
    {
        return $this->hasMany(Feedback::class, 'citizen_id');
    }

    public function notification(): HasMany {
        return $this->hasMany(Notification::class, 'profile_id');
    }
}
