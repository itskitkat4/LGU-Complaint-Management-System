<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Barangay extends Model
{
    //Laravel define barangay table to be used in the model
    protected $table = 'barangays';

    protected $fillable = [
        'id',
        'name',
        'code'
    ];

    // Supabase provides UUIDs, so the ID is not auto-incrementing.
    public $incrementing = false;

    // The primary key is stored as a string (UUID)
    protected $keyType = 'string';
}
