<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class ComplaintCategory extends Model
{

    use HasUlids;
    //Laravel define complaint_categories table to be used in the model
    protected $table = 'complaint_categories';

    protected $fillable = [
        'name',
        'description',
        'is_active'
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }


}
