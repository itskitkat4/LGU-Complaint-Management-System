<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Report extends Model
{
    protected $fillable = [
        'report_number',
        'generated_by',
        'date_from',
        'date_to',
        'file_path',
    ];

    protected function casts(): array
    {
        return [
            'date_from' => 'date',
            'date_to' => 'date',
        ];
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'generated_by');
    }

    public function summaries(): HasMany
    {
        return $this->hasMany(ReportSummary::class);
    }
}
