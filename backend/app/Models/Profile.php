<?php

namespace App\Models;

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
    ];

    // Supabase provides UUIDs, so the ID is not auto-incrementing.
    public $incrementing = false;


    // The primary key is stored as a string (UUID).
    protected $keyType = 'string';
}
