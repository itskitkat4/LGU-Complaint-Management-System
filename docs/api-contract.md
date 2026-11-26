# BantaySerbisyo API Contract

**Project:** Complaint Management and Citizen Feedback System for Local Government Units
**Version:** 1.0
**Status:** Source-referenced contract; deployment behavior remains unverified
**Base URL:** `http://localhost:8000/api`

## 1. General API Rules

- Backend framework: Laravel 13.
- Database: Supabase PostgreSQL.
- Authentication: Supabase Auth.
- Protected endpoints require a valid Supabase access token.
- Protected requests use `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`.
- Request and response bodies use JSON unless an endpoint handles file uploads.
- IDs use UUID format.
- Timestamps use ISO 8601 format where returned by the API.
- The backend must validate inputs and enforce role-based and record-level authorization.

### Standard Request Headers

```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

The Authorization header is required for protected endpoints. Do not expose access tokens in logs or public responses.

## 2. Roles

The system uses these role names:

- `citizen`
- `Barangay_Head`
- `LGU-Staff`
- `System Administrator`
- `Department_Head`
- `Department_Personnel`

The backend determines permissions using the authenticated user's verified identity and database profile. The frontend must not be trusted to determine a user's role.

## 3. Authentication and Profile Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/auth/me` | Authenticated | Return the verified authentication identity |
| GET | `/auth/profile` | Authenticated | Retrieve an existing profile; return `404` if absent |
| GET | `/profile` | Authenticated citizen | Retrieve or initialize a Google-authenticated citizen profile |
| PUT | `/profile` | Authenticated citizen | Set the citizen's barangay |
| GET | `/barangays` | Public | Retrieve available barangays |
| GET | `/complaint-categories` | Public | Retrieve complaint categories |

### GET `/auth/me`

Returns the verified Supabase identity.

Example response:

```json
{
  "message": "Authenticated successfully.",
  "user": {
    "id": "uuid",
    "email": "citizen@example.com"
  }
}
```

### GET `/auth/profile`

Returns an existing profile for any authenticated user. It does not create one and returns `404` if no profile exists.

### GET `/profile`

Returns the citizen profile or provisions one for an eligible Google OAuth identity. It rejects staff accounts, and returns `403` when the password-setup marker is explicitly incomplete. The response includes `requires_onboarding`, true when no barangay is selected.

### PUT `/profile`

Accepts required UUID `barangay_id` for the authenticated citizen and returns the updated profile. It does not update name, role, email, department, or staff barangay assignment.

### Staff Account Administration

`POST /staff-accounts` is restricted to System Administrators. When creating a `Barangay_Head`, `barangay_id` is required. The API returns `201` when the account is created, and `409` with a clear message if that barangay already has an active Barangay Head. Inactive Barangay Head profiles do not prevent a new active head from being assigned. The database's partial unique index remains the final concurrency-safe guard; if a concurrent create wins after the API check, the conflict is returned as `409` and cleanup of the newly invited Supabase Auth user is attempted.

New staff invitations receive the trusted Supabase `app_metadata.bantayserbisyo_password_setup_completed=false` marker. `POST /staff-accounts/complete-password-setup` is available to the authenticated, active staff member; the backend validates the displayed password policy and updates the password and completion marker in a single Supabase Admin API request. `GET /staff-accounts` reports `invitation_setup_completed` as `true`, `false`, or `null` when the marker is absent or cannot be verified. Only an explicit `false` account is eligible for resend. An unconfirmed account receives a fresh signup invitation; a confirmed-but-incomplete account receives a recovery link to the existing account. Existing accounts without the marker remain unverified and require manual review before marking setup complete or incomplete.

Other registered account and directory routes:

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/staff-accounts` | System Administrator | Invite/create a staff account |
| GET | `/staff-accounts` | System Administrator | List staff accounts and setup-marker state |
| POST | `/staff-accounts/{staffId}/send-new-invitation` | System Administrator | Resend setup invitation for an eligible account |
| PATCH | `/staff-accounts/{staffId}/deactivate` | System Administrator | Deactivate a staff account |
| POST | `/staff-accounts/complete-password-setup` | Authenticated active staff | Complete invited staff password setup |
| GET | `/departments` | System Administrator, LGU-Staff, Department_Head, Department_Personnel, Barangay_Head | List departments |
| POST | `/departments` | System Administrator | Create a department |
| PUT | `/departments/{id}` | System Administrator | Update a department |
| DELETE | `/departments/{id}` | System Administrator | Delete a department when no staff, assignments, or escalations reference it |

Additional registered authenticated routes:

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/citizen/complaint-assistant/chat` | Citizen | Request AI-assisted complaint drafting |
| GET | `/feedback` | Active citizen, LGU-Staff, Barangay_Head, Department_Head | View own feedback (citizen) or scoped feedback monitoring (staff roles) |
| GET | `/notifications` | Authenticated active profile | List the profile's notifications; optional `page` integer, minimum 1 |
| GET | `/notifications/unread-count` | Authenticated active profile | Return unread count |
| PATCH | `/notifications/{notification_id}/read` | Authenticated active profile, own notification | Mark one notification read |
| PATCH | `/notifications/read-all` | Authenticated active profile | Mark own notifications read |

The route file has no API endpoint for complaint category administration; `GET /complaint-categories` is public and read-only.

`GET /staff/complaints/{complaintId}/eligible-assignees` returns `200` with a `message` and `data` list containing identity/contact and unit ID fields. It returns `401` without verified authentication, `403` for other roles, `404` for an unknown complaint, and `422` when handling level has not been determined. Results are filtered to active heads matching the complaint's handling level; for LGU-level complaints the response includes active Department Heads with a department, not just a selected department.

## 4. Complaint and Review Endpoints — Implemented

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/complaints` | Citizen | List the authenticated citizen's complaints |
| POST | `/complaints` | Citizen | Create a complaint |
| GET | `/complaints/{complaintId}` | Citizen, own complaint | View complaint details, updates, attachment metadata, and approved resolutions |
| GET | `/staff/complaints` | LGU-Staff | List complaints for staff review |
| GET | `/staff/complaints/history` | LGU-Staff | View staff complaint history |
| GET | `/staff/complaints/{complaintId}` | LGU-Staff | View complaint details for staff review |
| GET | `/staff/complaints/{complaintId}/eligible-assignees` | LGU-Staff | List active Barangay Heads or Department Heads eligible for routing |
| GET | `/admin/complaints` | System Administrator | Paginated administrative complaint list, including anonymous complainant identity |
| GET | `/admin/complaints/{complaintId}` | System Administrator | Administrative complaint detail, including identity and attachment metadata |
| POST | `/complaints/{complaintId}/review` | LGU-Staff | Start review, accept, or decline |
| POST | `/staff/complaints/{complaintId}/route` | LGU-Staff | Route or transfer an accepted, assigned, or in-progress complaint |
| GET | `/complaint-attachments/{attachmentId}/signed-url` | Authenticated; complaint access required | Obtain a temporary signed URL for authorized evidence |

Complaint evidence uploads are accepted as `attachments` in the citizen complaint creation request; there are no separate `POST /complaints/{id}/attachments` or `GET /complaints/{id}/attachments` routes in the current route file.

The LGU-Staff review request uses `decision: start_review` to move `submitted` to `under_review`; this action requires `priority`. Then `decision: accepted` (with `resolution_level`) or `decision: declined` (with `rejection_reason`) moves a complaint from `under_review` to that decision state. Either final decision may include a `priority`; omitting it preserves the current value. Routing is allowed from `accepted`, `assigned`, or `in_progress`.

The implemented citizen `GET /complaints` endpoint returns the authenticated citizen's 10 newest complaints, pagination metadata, and `statistics` aggregated across all of that citizen's complaints. The statistics include `total`, `pre_assignment` (`submitted`, `under_review`, and `accepted`), `in_progress` (`assigned` plus `in_progress`), and `resolved` (`resolved` only). `pre_assignment` and `in_progress` are presentation groupings; neither is a stored complaint status or a resolution review status.

### Complaint Creation and Priority Assignment

The backend validates the complaint title, description, category, barangay, and optional `is_anonymous` boolean (default `false`). Complaint priority is not citizen-controlled: new complaints are stored with the existing default `medium` priority, and any client-supplied `priority` value is ignored. The authenticated citizen's identity must come from the verified server-side authentication context, not a client-supplied `citizen_id`. Anonymous choice is immutable after creation because no complaint update endpoint accepts it.

For an anonymous complaint, active System Administrators may view the actual complainant identity through the administrative list/detail endpoints. LGU-Staff, Barangay_Head, Department_Head, and Department_Personnel responses redact `citizen_id` and citizen profile data throughout complaint and nested workflow responses. Feedback monitoring suppresses citizen ID/name for anonymous complaints. Non-Admin personnel see generic original-evidence filenames and no uploader profile ID. The owning citizen continues to see their own identity and complaint data.

Allowed priority values:

- `low`
- `medium`
- `high`
- `urgent`

Only LGU-Staff may assign priority through the complaint review endpoint. The `start_review` action requires one of the values above. While the complaint is `under_review`, LGU-Staff may optionally update priority with the `accepted` or `declined` decision. The backend validates the value and returns the updated complaint, including its persisted `priority`. Citizens cannot set priority during creation or access the staff-only review route; AI-assisted complaint drafting does not persist or assign priority.

Example request to begin review:

```json
{
  "decision": "start_review",
  "priority": "high"
}
```

Example response:

```json
{
  "message": "Complaint reviewed successfully.",
  "complaint": {
    "id": "complaint-uuid",
    "status": "under_review",
    "priority": "high"
  }
}
```

New complaints use the `submitted` status by default. The backend controls status transitions.

### Evidence Upload

- Evidence files are stored in Supabase Storage.
- The backend validates file type, size, ownership, and complaint access.
- Database attachment records store MIME type, size, generated generic filename, and storage path. Client-provided original filenames are not retained. Embedded image metadata is not stripped from uploaded bytes.
- Access to evidence must be restricted to authorized users.

## 5. Complaint Statuses and Workflow — Implemented

Stored status values:

| Stored value | Meaning |
|---|---|
| `submitted` | Complaint has been submitted |
| `under_review` | LGU-Staff is reviewing the complaint |
| `accepted` | Complaint has been accepted for handling |
| `declined` | Complaint has been declined; a reason is required |
| `assigned` | Complaint has been assigned |
| `in_progress` | Responsible handler is working on the complaint |
| `resolved` | LGU-Staff approved the resolution; this is the final complaint status |

`pending_review` is not a valid complaint status in the source constraints. It is a `complaint_resolutions.review_status` value; the complaint remains `in_progress` while a resolution is awaiting review or has been returned.

There is no separate complaint closure step or `closed` complaint status. A complaint does not transition to another status after it becomes `resolved`.

Workflow rules:

1. LGU-Staff starts review, moving the complaint from `submitted` to `under_review`.
2. LGU-Staff accepts or declines the complaint from `under_review`; acceptance records whether it belongs to the barangay or LGU, while decline requires a reason.
3. Barangay-level complaints are handled by the Barangay_Head.
4. LGU-level complaints are routed to the appropriate department; Department_Head assigns Department_Personnel.
5. A Barangay Head or Department Personnel handler submits a resolution while the complaint is `in_progress`.
6. The resolution record enters `pending_review`; this does not change the complaint status.
7. LGU-Staff approval changes the resolution status to `approved` and the complaint status to `resolved`. Returning a resolution changes its review status to `returned` and leaves the complaint `in_progress`, allowing another resolution submission.
8. Only authorized server-side actions may change complaint status.

A transfer or reassignment is an event recorded in the assignment history, not a complaint status.

## 6. Resolution Endpoints — Implemented

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/complaints/{complaintId}/resolutions` | Assigned Barangay Head or Department Personnel | Submit a resolution |
| GET | `/staff/resolutions` | LGU-Staff | List pending resolutions for review |
| POST | `/staff/resolutions/{resolutionId}/review` | LGU-Staff | Approve or return a resolution |

Resolution review values:

- `pending_review`
- `approved`
- `returned`

The resolution submission is a multipart request. Required fields are `resolution_description` (string, 10–10,000 characters), `completed_at` (date accepted by Laravel's `date` rule and not after today), `before_photo` (required image, JPG/JPEG/PNG/WEBP, max 10,240 KB), and `evidence` (required array with 1–5 files; each file must be JPG/JPEG/PNG/PDF/WEBP, max 10,240 KB). The before photo is stored with evidence type `before`; files in `evidence` use `supporting`. A valid submission returns `201` with `message` and the resolution under `data`. Authentication failure returns `401`; a missing complaint returns `404`; unauthorized role/scope or assignment returns `403`; non-`in_progress` complaint, pending prior resolution, and validation failures return `422` (Laravel validation response for invalid fields). Upload/storage exceptions are rethrown after best-effort cleanup, so their final HTTP response depends on Laravel exception handling.

A review request requires `decision` (`approved` or `returned`); `review_comment` is required for `returned`, must not be whitespace-only, and is limited to 2,000 characters. Review returns `200` with the updated resolution and complaint under `data`. The current implementation creates a separate resolution record after a returned record; another submission is blocked while any resolution is still `pending_review`. Approval changes complaint status to `resolved` and ends its active assignment; return leaves complaint status `in_progress`. Approved resolutions are included in the owning citizen's complaint detail response. There is no separate complaint resolution-history GET route.

## 7. Assignment Workflows — Implemented

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/admin/dashboard-summary` | System Administrator | Return system-wide user, complaint, department, and barangay totals |
| GET | `/barangay/dashboard-summary` | Barangay_Head | Return complaint counts for the head's active barangay assignments |
| GET | `/barangay/complaints` | Barangay_Head | List complaints actively assigned within the head's barangay |
| GET | `/barangay/complaints/history` | Barangay_Head | List paginated complaints registered for the head's barangay, regardless of current or ended assignment |
| POST | `/barangay/complaints/{complaintId}/start` | Assigned Barangay_Head | Start work on an assigned complaint |
| GET | `/department/complaints` | Department_Head | List complaints in the head's department |
| GET | `/department/monitoring` | Department_Head | View department assignments, status counts, handlers, and external escalation history |
| GET | `/staff/dashboard-summary` | LGU-Staff | Return all complaint lifecycle counts and the pending resolution-review count |
| GET | `/department/personnel/dashboard-summary` | Department_Personnel | Return counts for the personnel member's active LGU assignments and resolutions |
| GET | `/department/personnel` | Department_Head | List eligible personnel in the head's department |
| POST | `/department/complaints/{complaintId}/assign` | Department_Head | Assign a complaint to eligible personnel in the same department |
| GET | `/department/personnel/complaints` | Department_Personnel | List complaints actively assigned to the personnel member |
| GET | `/department/personnel/complaints/{complaintId}` | Department_Personnel | View an assigned complaint |
| POST | `/department/personnel/complaints/{complaintId}/start` | Assigned Department_Personnel | Start work on an assigned complaint |

The route file does not register standalone assignment-history or complaint-update-history endpoints. Assignment changes are recorded by the applicable routing and assignment workflows.

Dashboard response shapes vary by endpoint:

- `GET /admin/dashboard-summary` returns the root-level integer aggregates `users`, `complaints`, `barangays`, and `departments`.
- `GET /staff/dashboard-summary`, `GET /barangay/dashboard-summary`, and `GET /department/personnel/dashboard-summary` return integer aggregates under `statistics`. The LGU-Staff summary includes `total_complaints`, each of the seven complaint lifecycle status keys, and `resolutions_pending_review` from `complaint_resolutions.review_status`. The latter is a resolution workflow count, not a complaint status.
- `GET /department/monitoring` returns lifecycle counts under `status_counts` and assignment counts under `assignment_counts`.
- `GET /complaints` returns the authenticated citizen's paginated complaint `data`, pagination metadata under `pagination`, and grouped complaint counts under `statistics`.

Barangay Head counts are limited to active `barangay` assignments assigned to the authenticated head and matching their profile's barangay. Department Personnel counts are limited to active `lgu` assignments assigned to the authenticated personnel member and matching their profile's department. Both summaries include `returned_for_follow_up`, counting in-progress assigned complaints whose latest resolution submission was returned. The workflow defines returned resolutions as requiring additional work before another submission; a later submission replaces the prior returned submission as the current follow-up state.

The Barangay Head complaint history endpoint is separately scoped by the authenticated profile's `barangay_id` against `complaints.barangay_id`, the complaint's registered barangay. It includes all lifecycle statuses and does not require an active assignment. It accepts an optional `status` filter using one of the seven complaint lifecycle statuses and returns `data` with pagination metadata. Since complaints have no separate tracking-number field, the complaint UUID is displayed as the tracking number.

Department Head monitoring returns status aggregates under `status_counts`, grouped across active `lgu` assignments in the authenticated head's department. It contains all seven lifecycle statuses. Its separate `assignment_counts.awaiting_assignment` value counts complaints with lifecycle status `assigned` whose active department assignment is still assigned to the authenticated Department Head. The workflow assigns these complaints onward to Department Personnel; this metric is not a lifecycle status count.

## Reports and Analytics

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/staff/reports/summary` | LGU-Staff | Return all-time totals, status/category breakdowns, and six monthly buckets |
| POST | `/staff/reports` | LGU-Staff | Generate an aggregated report for a requested date range |
| POST | `/staff/reports/{report}/pdf` | Active LGU-Staff | Upload the report PDF (`file`, PDF MIME, max 10 MB) |
| GET | `/staff/reports/{report}/pdf/signed-url` | Active LGU-Staff | Generate a five-minute signed report download URL |

The report summary's `pending` value groups `submitted`, `under_review`, and `accepted`; it is a pre-assignment summary, not a lifecycle status. Its monthly `received` value is grouped by complaint creation month. Monthly `resolved` counts complaint records with an approved resolution, grouped by the first approval's review month. The date range submitted to `POST /staff/reports` applies to that generated report and does not filter the all-time summary or its six-month chart.

`POST /staff/reports/{report}/pdf` requires multipart field `file` validated as a file with `mimes:pdf`, `mimetypes:application/pdf`, and max `10240` KB. Success returns `200` with `message` and a `report` object (`id`, `report_number`, `file_path`). It returns `403` for inactive staff, `404` for an unknown report, `422` for an invalid upload, and `500` for a caught storage/database failure. `GET /staff/reports/{report}/pdf/signed-url` returns `200` with `report`, `signed_url`, and `expires_in: 300`; it returns `403` for inactive staff, `404` for an unknown report or one without a stored PDF, and `500` if signed URL generation fails. Both controller actions require an active LGU-Staff profile; the enclosing route middleware also restricts the role to `LGU-Staff`. The signed URL is valid for five minutes.

## Barangay Escalation Review — Implemented

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/complaints/{complaintId}/escalations` | Assigned Barangay Head or Department Head | Request an escalation with a reason and destination |
| GET | `/staff/escalations` | Active LGU-Staff | List pending Barangay Head to department escalation requests in the LGU-Staff inbox |
| POST | `/staff/escalations/{escalationId}/review` | Active LGU-Staff | Accept the requested department or redirect to a selected department |

For Barangay Head requests, the review body requires `decision` (`accepted` or `redirected`) and a `review_comment` of at least 10 characters. `destination_department_id` is required when redirecting. Either decision routes the complaint to the selected department's active Department Head, records the assignment and complaint update, and leaves the complaint `assigned` at LGU level. The receiving Department Head sees it in their department complaint queue. The current implementation uses these queues; it does not send a separate email or push notification.

## Department Head Monitoring and External Escalation — Implemented

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/department/monitoring` | Active Department Head | View active assignments across the authenticated head's department, current assignees, status counts, and external escalation history |
| POST | `/complaints/{complaintId}/escalations` | Active Department Head assigned to the complaint's department | Record an escalation to a named higher-authority office with a reason |
| POST | `/department/escalations/{escalationId}/outcome` | Active Department Head in the escalation's origin department | Record the external authority's response or decision |

The monitoring endpoint is department-scoped and includes work currently assigned to Department Personnel as well as complaints still assigned to the Department Head. Barangay-to-department escalation requests remain in the LGU-Staff review inbox; Department Heads do not review or redirect those requests.

## 8. Feedback Endpoints — Implemented

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/feedback/eligible-complaints` | Citizen | List the citizen's resolved complaints without prior feedback |
| POST | `/complaints/{complaint_id}/feedback` | Owning citizen, for a resolved complaint without existing feedback | Submit feedback |

Feedback submission requires `rating` (integer, 1–5) and `comment` (string, maximum 2000 characters). The authenticated profile ID is used as `citizen_id`; a client-supplied `citizen_id` is ignored. The API scopes the complaint lookup by both its ID and the authenticated citizen ID, returning `404` for another citizen's or missing complaint without disclosing complaint details. Only resolved complaints are eligible, and a complaint can receive feedback once; ineligible or duplicate submissions return `422`.

Successful submission returns `201` with `message` and the created `feedback` record.
The base source schema stores separate `feedback.citizen_id` and `feedback.complaint_id` foreign keys. Migration `2026_11_23_000001_enforce_feedback_complaint_ownership.php` adds a composite ownership constraint (or equivalent SQLite triggers), so the pair must match the complaint owner when that migration has been executed. Repository presence does not verify deployment execution. The authenticated API also checks ownership and eligibility.

## 9. Error Responses

Validation errors should return HTTP `422` with field-level details.

Example:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "title": [
      "The title field is required."
    ]
  }
}
```

Common HTTP statuses:

- `200` — Request succeeded.
- `201` — Resource created.
- `401` — Missing or invalid authentication.
- `403` — Authenticated user lacks permission.
- `404` — Resource not found or not accessible, according to the security policy.
- `422` — Validation failed.
- `500` — Unexpected server error.

Error responses must not expose credentials, access tokens, database passwords, or internal stack traces.

## 10. Source and Deployment Status

This document records the source-level routes and behavior reviewed for this version. Runtime behavior against a deployed Supabase project, including deployed schema, authentication, RLS, and storage policies, remains unverified.

Update this document whenever endpoint paths, request fields, response formats, or authorization rules change.
