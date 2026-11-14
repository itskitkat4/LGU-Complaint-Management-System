<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\Report;
use App\Models\ReportSummary;
use App\Services\SupabaseStorageService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class StaffReportController extends Controller
{
    // Get complaints submitted by Citizens only.
    private function citizenComplaintsQuery()
    {
        return DB::table('complaints')
            ->join('profiles', 'complaints.citizen_id', '=', 'profiles.id')
            ->where('profiles.role', 'citizen');
    }

    // ==========================================
    // 1. DASHBOARD SUMMARY
    // ==========================================

    public function summary()
    {
        $complaints = $this->citizenComplaintsQuery();

        $total = (clone $complaints)->count('complaints.id');

        $pending = (clone $complaints)
            ->whereIn('complaints.status', [
                'submitted',
                'under_review',
                'accepted'
            ])
            ->count('complaints.id');

        $inProgress = (clone $complaints)
            ->whereIn('complaints.status', [
                'assigned',
                'in_progress'
            ])
            ->count('complaints.id');

        $resolved = (clone $complaints)
            ->where('complaints.status', 'resolved')
            ->count('complaints.id');

        // Count complaints by status.
        $byStatus = (clone $complaints)
            ->select('complaints.status')
            ->selectRaw('COUNT(complaints.id) as total')
            ->groupBy('complaints.status')
            ->orderBy('complaints.status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => $item->status,
                    'total' => (int) $item->total
                ];
            });

        // Count complaints by category.
        $byCategory = (clone $complaints)
            ->join(
                'complaint_categories',
                'complaints.category_id',
                '=',
                'complaint_categories.id'
            )
            ->selectRaw('complaint_categories.name as category')
            ->selectRaw('COUNT(complaints.id) as total')
            ->groupBy(
                'complaint_categories.id',
                'complaint_categories.name'
            )
            ->orderBy('complaint_categories.name')
            ->get()
            ->map(function ($item) {
                return [
                    'category' => $item->category,
                    'total' => (int) $item->total
                ];
            });

        // Prepare the latest six months.
        $now = CarbonImmutable::now();
        $startMonth = $now->startOfMonth()->subMonths(5);

        $monthly = [];

        for ($i = 0; $i < 6; $i++) {
            $month = $startMonth->addMonths($i);
            $key = $month->format('Y-m');

            $monthly[$key] = [
                'month' => $key,
                'received' => 0,
                'resolved' => 0
            ];
        }

        // Count complaints received each month.
        $receivedDates = (clone $complaints)
            ->whereBetween('complaints.created_at', [
                $startMonth,
                $now
            ])
            ->pluck('complaints.created_at');

        foreach ($receivedDates as $date) {
            $key = CarbonImmutable::parse($date)->format('Y-m');

            if (isset($monthly[$key])) {
                $monthly[$key]['received']++;
            }
        }

        // Count approved resolutions each month.
        $resolvedDates = DB::table('complaint_resolutions')
            ->join(
                'complaints',
                'complaint_resolutions.complaint_id',
                '=',
                'complaints.id'
            )
            ->join(
                'profiles',
                'complaints.citizen_id',
                '=',
                'profiles.id'
            )
            ->where('profiles.role', 'citizen')
            ->where('complaint_resolutions.review_status', 'approved')
            ->whereNotNull('complaint_resolutions.reviewed_at')
            ->whereBetween('complaint_resolutions.reviewed_at', [
                $startMonth,
                $now
            ])
            ->selectRaw(
                'complaints.id, MIN(complaint_resolutions.reviewed_at) as reviewed_at'
            )
            ->groupBy('complaints.id')
            ->get();

        foreach ($resolvedDates as $item) {
            $key = CarbonImmutable::parse($item->reviewed_at)
                ->format('Y-m');

            if (isset($monthly[$key])) {
                $monthly[$key]['resolved']++;
            }
        }

        return response()->json([
            'summary' => [
                'total' => $total,
                'pending' => $pending,
                'in_progress' => $inProgress,
                'resolved' => $resolved
            ],
            'by_status' => $byStatus,
            'by_category' => $byCategory,
            'monthly' => array_values($monthly)
        ]);
    }

    // ==========================================
    // 2. GENERATE CONSOLIDATED REPORT
    // ==========================================

    public function store(Request $request)
    {
        // Validate selected dates.
        $request->validate([
            'date_from' => 'required|date_format:Y-m-d',
            'date_to' => 'required|date_format:Y-m-d|after_or_equal:date_from'
        ]);

        // Get logged-in staff.
        $user = $request->attributes->get('supabase_user');
        $staff = Profile::find($user['id'] ?? null);

        if (!$staff || $staff->role !== 'LGU-Staff' || !$staff->is_active) {
            return response()->json([
                'message' => 'Only active LGU Staff can generate reports.'
            ], 403);
        }

        // Prepare selected date range.
        $dateFrom = CarbonImmutable::parse($request->date_from)->startOfDay();
        $dateTo = CarbonImmutable::parse($request->date_to)->endOfDay();

        // Get Citizen complaints within selected dates.
        $complaints = $this->citizenComplaintsQuery()
            ->whereBetween('complaints.created_at', [
                $dateFrom,
                $dateTo
            ]);

        // Count total complaints.
        $total = (clone $complaints)->count('complaints.id');

        // Count pending complaints.
        $pending = (clone $complaints)
            ->whereIn('complaints.status', [
                'submitted',
                'under_review',
                'accepted'
            ])
            ->count('complaints.id');

        // Count in-progress complaints.
        $inProgress = (clone $complaints)
            ->whereIn('complaints.status', [
                'assigned',
                'in_progress'
            ])
            ->count('complaints.id');

        // Count resolved complaints.
        $resolved = (clone $complaints)
            ->where('complaints.status', 'resolved')
            ->count('complaints.id');

        // Count declined complaints.
        $declined = (clone $complaints)
            ->where('complaints.status', 'declined')
            ->count('complaints.id');

        // Count complaints by category.
        $categories = (clone $complaints)
            ->join(
                'complaint_categories',
                'complaints.category_id',
                '=',
                'complaint_categories.id'
            )
            ->select(
                'complaint_categories.id',
                'complaint_categories.name'
            )
            ->selectRaw('COUNT(complaints.id) as total')
            ->groupBy(
                'complaint_categories.id',
                'complaint_categories.name'
            )
            ->orderBy('complaint_categories.name')
            ->get();

        // Prepare monthly summary buckets.
        $monthly = [];

        $startMonth = $dateFrom->startOfMonth();
        $endMonth = $dateTo->startOfMonth();

        for (
            $month = $startMonth;
            $month <= $endMonth;
            $month = $month->addMonth()
        ) {
            $key = $month->format('Y-m');

            $monthly[$key] = [
                'month' => $key,
                'received' => 0,
                'resolved' => 0
            ];
        }

        // Count complaints received per month.
        $receivedDates = (clone $complaints)
            ->pluck('complaints.created_at');

        foreach ($receivedDates as $date) {
            $key = CarbonImmutable::parse($date)->format('Y-m');

            if (isset($monthly[$key])) {
                $monthly[$key]['received']++;
            }
        }

        // Count approved resolutions per month.
        $resolvedDates = DB::table('complaint_resolutions')
            ->join(
                'complaints',
                'complaint_resolutions.complaint_id',
                '=',
                'complaints.id'
            )
            ->join(
                'profiles',
                'complaints.citizen_id',
                '=',
                'profiles.id'
            )
            ->where('profiles.role', 'citizen')
            ->where('complaint_resolutions.review_status', 'approved')
            ->whereNotNull('complaint_resolutions.reviewed_at')
            ->whereBetween('complaint_resolutions.reviewed_at', [
                $dateFrom,
                $dateTo
            ])
            ->selectRaw(
                'complaints.id, MIN(complaint_resolutions.reviewed_at) as reviewed_at'
            )
            ->groupBy('complaints.id')
            ->get();

        foreach ($resolvedDates as $item) {
            $key = CarbonImmutable::parse($item->reviewed_at)
                ->format('Y-m');

            if (isset($monthly[$key])) {
                $monthly[$key]['resolved']++;
            }
        }

        $monthly = array_values($monthly);

        // Prepare status summaries.
        $statuses = [
            'Pending' => $pending,
            'In Progress' => $inProgress,
            'Resolved' => $resolved,
            'Declined' => $declined
        ];

        // Save report and summaries in one transaction.
        $report = DB::transaction(function () use (
            $staff,
            $request,
            $statuses,
            $categories,
            $monthly
        ) {
            // Create report record.
            $report = Report::create([
                'generated_by' => $staff->id,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to
            ]);

            // Generate report number.
            $report->update([
                'report_number' => 'R' . str_pad(
                    $report->id,
                    6,
                    '0',
                    STR_PAD_LEFT
                )
            ]);

            // Save status summaries.
            foreach ($statuses as $label => $count) {
                ReportSummary::create([
                    'report_id' => $report->id,
                    'summary_type' => 'status',
                    'label' => $label,
                    'total' => (int) $count
                ]);
            }

            // Save category summaries.
            foreach ($categories as $category) {
                ReportSummary::create([
                    'report_id' => $report->id,
                    'summary_type' => 'category',
                    'label' => $category->name,
                    'category_id' => $category->id,
                    'total' => (int) $category->total
                ]);
            }

            // Save monthly summaries ONCE.
            foreach ($monthly as $item) {
                ReportSummary::create([
                    'report_id' => $report->id,
                    'summary_type' => 'month',
                    'label' => $item['month'],
                    'month' => $item['month'] . '-01',
                    'received' => (int) $item['received'],
                    'resolved' => (int) $item['resolved']
                ]);
            }

            return $report;
        });

        // Return generated report details.
        return response()->json([
            'message' => 'Report generated successfully.',
            'report' => [
                'id' => $report->id,
                'report_number' => $report->report_number,
                'date_from' => $report->date_from,
                'date_to' => $report->date_to,
                'total_complaints' => $total,
                'pending' => $pending,
                'in_progress' => $inProgress,
                'resolved' => $resolved,
                'declined' => $declined,
                'categories' => $categories,
                'monthly' => $monthly
            ]
        ], 201);
    }

    // ==========================================
    // 3. UPLOAD CONSOLIDATED REPORT PDF
    // ==========================================

    public function uploadPdf(
        Request $request,
        Report $report,
        SupabaseStorageService $storage
    ) {
        // Validate uploaded PDF.
        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:pdf',
                'mimetypes:application/pdf',
                'max:10240',
            ],
        ]);

        // Verify active LGU Staff.
        $user = $request->attributes->get('supabase_user');
        $staff = Profile::find($user['id'] ?? null);

        if (!$staff || $staff->role !== 'LGU-Staff' || !$staff->is_active) {
            return response()->json([
                'message' => 'Only active LGU Staff can upload report PDFs.',
            ], 403);
        }

        // Prepare a unique file path.
        $file = $request->file('file');

        $path = 'reports/'
            . $report->report_number
            . '/'
            . Str::uuid()
            . '.pdf';

        $bucket = config(
            'services.supabase.reports_storage_bucket',
            'reports'
        );

        $uploaded = false;

        try {
            // Upload PDF to Supabase Storage.
            $storage->upload(
                $file,
                $path,
                $bucket
            );

            $uploaded = true;

            // Save Storage path in report record.
            $report->file_path = $path;
            $report->save();

            return response()->json([
                'message' => 'Report PDF uploaded successfully.',
                'report' => [
                    'id' => $report->id,
                    'report_number' => $report->report_number,
                    'file_path' => $report->file_path,
                ],
            ]);
        } catch (Throwable $exception) {
            // Remove uploaded file if database saving failed.
            if ($uploaded) {
                try {
                    $storage->delete($path, $bucket);
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }

            report($exception);

            return response()->json([
                'message' => 'Unable to upload the report PDF.',
            ], 500);
        }
    }

    // ==========================================
    // 4. GENERATE SIGNED PDF DOWNLOAD URL
    // ==========================================

    public function signedPdfUrl(
        Request $request,
        Report $report,
        SupabaseStorageService $storage
    ) {
        // Verify active LGU Staff.
        $user = $request->attributes->get('supabase_user');
        $staff = Profile::find($user['id'] ?? null);

        if (!$staff || $staff->role !== 'LGU-Staff' || !$staff->is_active) {
            return response()->json([
                'message' => 'Only active LGU Staff can download report PDFs.',
            ], 403);
        }

        // Verify that a PDF has been uploaded.
        if (!$report->file_path) {
            return response()->json([
                'message' => 'No PDF file is available for this report.',
            ], 404);
        }

        try {
            $bucket = config(
                'services.supabase.reports_storage_bucket',
                'reports'
            );

            // Generate signed URL valid for five minutes.
            $signedUrl = $storage->createSignedUrl(
                $report->file_path,
                300,
                $bucket
            );

            return response()->json([
                'message' => 'Signed download URL generated successfully.',
                'report' => [
                    'id' => $report->id,
                    'report_number' => $report->report_number,
                ],
                'signed_url' => $signedUrl,
                'expires_in' => 300,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Unable to generate the report download URL.',
            ], 500);
        }
    }
}
