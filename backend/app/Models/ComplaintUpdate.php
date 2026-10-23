<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

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
}
