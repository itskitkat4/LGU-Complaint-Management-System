<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportSummary extends Model
{
    protected $fillable = [
        'report_id',
        'summary_type',
        'label',
        'category_id',
        'total',
        'received',
        'resolved',
        'month',
    ];

    protected function casts(): array
    {
        return [
            'total' => 'integer',
            'received' => 'integer',
            'resolved' => 'integer',
            'month' => 'date',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ComplaintCategory::class, 'category_id');
    }
}
