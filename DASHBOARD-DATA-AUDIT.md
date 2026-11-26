# BantaySerbisyo Dashboard Data Audit

**Source review:** 2026-11-23
**Scope:** React dashboards for System Administrator, LGU Staff, Department Head, Barangay Head, Department Personnel, and Citizen; plus Staff Reports & Analytics.
**Method:** Read-only review of current frontend, Laravel routes/controllers, models, and migrations. No environment values, live Supabase records, or deployed database configuration were inspected. No code, database, or migration was changed or queried.

## Executive summary and verification limits

All six role dashboards now load source-backed summary data through Laravel endpoints. Staff Reports & Analytics also reads an API summary. The previous pre-integration descriptions of mock staff dashboards and a broken Department Head response are no longer current.

Here, **source-backed** means the frontend has a request path to a controller query. It does not establish that a deployed server is connected to the intended database or that live records are correct. Laravel uses its configured default connection; `backend/config/database.php` defaults to SQLite when `DB_CONNECTION` is unset and also supports PostgreSQL. The effective deployment connection and applied migration history remain unverified.

## A. Dashboard metric map

| Role / view | API endpoint | Displayed metrics and source calculation | Scope and important behavior |
|---|---|---|---|
| System Administrator | `GET /api/admin/dashboard-summary` | Total users (`Profile::count()`), complaints (`Complaint::count()`), departments, and barangays. | Four unfiltered table totals; inactive profiles are included. The current dashboard has no activity-feed panel or activity endpoint. |
| LGU Staff | `GET /api/staff/dashboard-summary` | Counts for each complaint status (`submitted`, `under_review`, `accepted`, `declined`, `assigned`, `in_progress`, `resolved`), total complaints, and resolution submissions with `review_status = pending_review`. | Active `LGU-Staff` access is required. Complaint and resolution totals are system-wide; this controller does not add a citizen, department, or date filter. |
| Department Head | `GET /api/department/monitoring?page=1` | Cards show awaiting assignment, assigned, in progress, and resolved. Backend also returns counts for all seven complaint statuses. | Status counts cover complaints with an active `lgu` assignment in the authenticated Head's department. Awaiting assignment counts `assigned` complaints whose active department assignment is still assigned to that Head. The list is paginated separately. |
| Barangay Head | `GET /api/barangay/dashboard-summary` | Assigned complaints (total), in progress, returned for follow-up, and resolved. | Counts only complaints with an active assignment to the authenticated Head at `assignment_level = barangay` and the Head's `barangay_id`. Missing barangay assignment returns `422`. |
| Department Personnel | `GET /api/department/personnel/dashboard-summary` | My assignments, in progress, returned for follow-up, and submitted for review. | Complaint counts require an active `lgu` assignment to the authenticated person in their department. Submitted for review counts resolution rows submitted by that person, not distinct complaints. Missing department assignment returns `422`. |
| Citizen | `GET /api/complaints?page=1` | Total complaints, pre-assignment, assigned/in progress, and resolved. | Scoped to the authenticated citizen. Aggregates use all of that citizen's complaints; the response list is newest-first and paginated at 10 records. The dashboard displays up to five recent rows from that page. |
| Staff Reports & Analytics | `GET /api/staff/reports/summary` | All-time total, pre-assignment (`pending` response key), in-progress, resolved; counts by status and category; six monthly received/resolved pairs. | System-wide complaints joined to profiles whose role is `citizen`; overview cards are not filtered by the date selectors used to generate a report. |

## B. Calculation details

### Complaint lifecycle

The source status constraint permits exactly:

`submitted`, `under_review`, `accepted`, `declined`, `assigned`, `in_progress`, `resolved`.

`pending_review` is a value of `complaint_resolutions.review_status`; it is not a complaint lifecycle status. The citizen dashboard's `pre_assignment` group is `submitted + under_review + accepted`. Its `in_progress` display group is `assigned + in_progress`. The Staff Reports API uses the response key `pending` for that same pre-assignment group; the frontend labels it **Pre-assignment**. The separate resolution-review counts must not be added to complaint status totals.

`DashboardSummaryController::complaintCounts` groups the scoped complaint query by status, returns a total, and fills missing lifecycle-status keys with zero. Staff Reports' `by_status` list instead includes statuses actually present in the query result.

### Assignment-scoped metrics

Barangay Head and Department Personnel summaries use `complaints.activeAssignment`, which means an assignment row with `ended_at IS NULL`, then match the authenticated assignee and assignment level. Barangay Head counts are further limited to their barangay; Personnel counts are limited to their department.

For both roles, **Returned for Follow-up** counts distinct in-progress assigned complaints whose latest resolution submission has `review_status = returned`. “Latest” is selected by `submitted_at`, then `created_at`, then `id`. A newer resolution submission means an earlier returned submission no longer counts. The Personnel **Submitted for Review** metric counts pending-review resolution rows for that person and their active assignment set; resubmissions can make this a count of rows rather than unique complaints.

Department monitoring counts all active department-level assignments for the Head's department. Its **Awaiting Assignment** card is narrower: the complaint must have lifecycle status `assigned` and the active assignment must still name that Department Head as assignee.

### Staff Reports and date fields

The summary endpoint counts complaints whose `citizen_id` joins to a profile with role `citizen`; it does not filter inactive profiles. Category totals use an inner join to `complaint_categories`, so only categories with complaint rows appear.

The monthly summary builds six buckets from the current month and the five preceding months. Received counts use `complaints.created_at`, from the first day of the earliest bucket through `CarbonImmutable::now()`. Resolved counts use approved `complaint_resolutions.reviewed_at` values in the same window, exclude null review dates, and count a complaint at most once using its earliest qualifying review date. The current month is partial through the query's `now`; application timezone configuration therefore affects the boundary.

Generated reports are separate from the all-time summary. The report endpoint applies the selected `date_from`/`date_to` range to complaint creation dates using start-of-day and end-of-day boundaries; approved resolution review dates are also evaluated against that selected range. The frontend then builds the PDF and uploads it through the report endpoints.

## C. Frontend behavior and role access

Dashboard pages validate returned metric shapes and display loading/error states instead of treating an invalid response as a successful count. The citizen page also checks its statistics against paginator totals. Staff Reports validates summary, status, category, and month structures before rendering.

Laravel routes apply Supabase-token authentication and role middleware. The summary routes are restricted to the matching role. The staff, barangay, and personnel summary controller methods additionally require an active profile; their complaint scopes are as described above. Admin totals are system-wide. Citizen totals are scoped to the authenticated citizen. No client-side query to the database is used for these summaries.

## D. Data model and source paths reviewed

Dashboard calculations use `profiles`, `complaints`, `complaint_assignments`, `complaint_resolutions`, `complaint_categories`, `barangays`, and `departments`. Relevant columns include `profiles.role`, `profiles.is_active`, `complaints.citizen_id`, `complaints.status`, `complaints.created_at`, `complaint_assignments.assigned_to`, `assignment_level`, `department_id`, `barangay_id`, `ended_at`, and resolution `review_status`, `submitted_by`, `submitted_at`, and `reviewed_at`.

Source paths reviewed:

- Frontend dashboards: `frontend/src/pages/{admin,staff,department-head,barangay,department-personnel,citizen}/Dashboard.jsx` and `frontend/src/pages/staff/StaffReports.jsx`.
- API client: `frontend/src/lib/api.js`.
- Routes: `backend/routes/api.php`.
- Controllers: `AdminDashboardController`, `DashboardSummaryController`, `ComplaintController`, `DepartmentComplaintController`, and `StaffReportController` under `backend/app/Http/Controllers/Api`.
- Model and status constraints: `backend/app/Models/Complaint.php` and complaint status migrations under `backend/database/migrations`.
- Summary regression coverage exists in `backend/tests/Feature/DashboardSummaryTest.php` and `backend/tests/Feature/CitizenDashboardStatisticsTest.php`; PostgreSQL-oriented tests are also present. They were not run as part of this documentation update.

## E. Remaining verification limits

- No live Supabase or PostgreSQL records were queried, and no migration history was inspected. Source queries cannot prove the deployed database target, deployed schema, or live dashboard values.
- Summary data is unaudited against a production baseline. In particular, Admin totals include inactive profiles, Staff dashboard counts are system-wide, and the report summary uses only complaints joined to citizen profiles.
- Dashboard date ranges and monthly buckets are source-defined; deployed timezone and runtime database behavior were not verified.
- No application code, database, environment file, or migration was changed for this audit.
