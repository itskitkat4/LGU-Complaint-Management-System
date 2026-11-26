# BantaySerbisyo Full-System Audit Report

**Original audit date:** 2026-11-15
**Current-source alignment review:** 2026-11-23
**Scope:** React/Vite frontend, Laravel API, authentication middleware, models, migrations, project documentation, and safe local checks.
**Data handling:** No secret values were included. No live Supabase data was accessed and no migration or destructive command was run.

## A. Executive Summary

The project has a React/Vite web frontend and a Laravel API. Supabase Auth supplies user authentication, and Laravel uses its configured database connection and Supabase Storage service. Complaint submission, review, assignment, resolution, feedback, notifications, dashboards, reports, and the AI complaint assistant have source implementations. BUG-001 through BUG-008 record findings from the original audit; later source changes affect the status notes below.

**Confirmed bug inventory:** 8 findings: **0 Critical, 0 High, 5 Medium, 3 Low**.
**Remediation status:** BUG-001 through BUG-008 have source-level remediations. BUG-006 now has an ownership-constraint migration; whether it has been applied to a deployed database is unverified.
**Security review:** 1 confirmed Medium-severity authorization race before remediation; no Critical or High exploitable vulnerabilities were confirmed by the security review.
**Current implementation note:** The citizen notification page now exposes pagination controls for the API's 10-record pages. The frontend test suite uses Vitest; original audit test results below are historical and were not rerun during this documentation update.
**Formal PRD comparison:** Not possible because no standalone PRD was found. The repository has workflow, database-design, and API-contract documents, but some are explicitly drafts and conflict with current code.

### Confirmed findings

| ID | Severity | Finding |
|---|---|---|
| BUG-001 | MEDIUM — FIXED | Department monitoring route previously called a controller method that did not exist. |
| BUG-002 | MEDIUM — FIXED | A Department Personnel member could start work after a concurrent reassignment ended their assignment. |
| BUG-003 | MEDIUM — FIXED | The citizen notifications page treated a Laravel paginator object as a list and always displayed an empty list. |
| BUG-004 | MEDIUM — FIXED | A Department Head could not obtain signed URLs for evidence on a complaint assigned directly to that Head. |
| BUG-005 | MEDIUM — FIXED | Citizen priority is intentionally ignored and defaults to `medium`; the missing LGU-Staff priority-assignment workflow has been implemented. |
| BUG-006 | LOW — API PATH VERIFIED | Feedback schema permits mismatched `citizen_id` and `complaint_id` values in direct/non-API writes; the authenticated feedback API scopes complaints to their owner and derives the stored citizen ID from the session profile. |
| BUG-007 | LOW — FIXED | Evidence preview URL state was synchronously updated inside an effect, failing the React Hooks lint rule. |
| BUG-008 | LOW — FIXED | Duplicate active Barangay Head creation was rejected by the database index but surfaced as HTTP 500. |

### Security-review summary

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟡 MEDIUM — FIXED | backend/app/Http/Controllers/Api/DepartmentComplaintController.php | `startWork` | Before remediation, a former Department Personnel assignee could transition a complaint to `in_progress` after reassignment. The transaction now rechecks and locks the caller's active assignment before changing status. | 9/10 |

This table records the security issue as originally found; the vulnerability has since been remediated.

The original review did not confirm other exploitable vulnerabilities in the source/configuration it reviewed. Deployed Supabase Auth/RLS/Storage policies, live OAuth settings, production TLS/CORS/debug settings, and Groq account/data-retention settings remain **UNVERIFIED**.

### Current implementation notes (source review: 2026-11-23)

- **AI complaint assistant:** `AIComplaintController` accepts authenticated citizen requests at `/api/citizen/complaint-assistant/chat`; `AIComplaintService` calls Groq's OpenAI-compatible chat-completions endpoint. `backend/config/services.php` reads `GROQ_API_KEY`, `GROQ_MODEL`, and `GROQ_MAX_CONVERSATION_CHARACTERS`; the source default model is `openai/gpt-oss-20b`, but a runtime `GROQ_MODEL` override was not inspected. The controller accepts 1–60 messages, roles `user` or `assistant`, up to 2,000 characters per message, and a configurable 20,000-character conversation total by default. The per-user limiter allows 10 requests per minute. The service uses 10-second connect and 45-second total timeouts and maps provider failures to service-unavailable responses. It drafts title, category, barangay, incident location, and description; a citizen reviews and submits the complaint through the normal complaint endpoint. The assistant does not submit complaints itself.
- **Authentication and authorization:** The browser uses Supabase Auth. Laravel's `VerifySupabaseToken` checks bearer-token claims and verifies the user through Supabase Auth before attaching the user/profile to the request; route groups and `CheckRole` gate the exact roles `System Administrator`, `LGU-Staff`, `Department_Head`, `Department_Personnel`, `Barangay_Head`, and `citizen`. Live provider settings remain unverified.
- **Database:** Eloquent and query-builder operations use Laravel's configured default connection. The source config defaults to SQLite when `DB_CONNECTION` is unset and supports PostgreSQL; this does not establish the deployed database target. The source contains 34 migration files at this review, but applied production migrations and records were not inspected.
- **Complaint workflow:** Source constraints define `submitted`, `under_review`, `accepted`, `declined`, `assigned`, `in_progress`, and `resolved`. `pending_review` is a resolution review state, not a complaint status. Anonymous submission is implemented with `complaints.is_anonymous` and response-redaction middleware. No separate human-readable tracking-number field or generation path was found.
- **Hosting security headers:** No production header configuration or selected frontend hosting provider was found. Response behavior for CSP, MIME sniffing, framing, and referrer policy remains unverified.

## B. Bug Inventory

### BUG-001 — Department monitoring route targeted a missing method (FIXED)

- **Severity:** MEDIUM
- **Status:** FIXED
- **Module:** Department Head workflow / API routing
- **Exact files:** `backend/routes/api.php:120`; `backend/app/Http/Controllers/Api/DepartmentComplaintController.php`
- **Function/component:** `DepartmentComplaintController::monitoringIndex`
- **Description:** At audit time, `GET /department/monitoring` was registered with `monitoringIndex`, but that controller action was missing.
- **Why it is a bug:** Every authorized request to the endpoint reaches a non-existent action and fails instead of returning monitoring data. The web page depends on this endpoint.
- **Steps to reproduce:** Sign in as a Department Head and open `/department/monitoring`, or call `GET /api/department/monitoring?page=1` with that account's access token.
- **Expected behavior:** Return the authenticated department's active assignments, current handlers, status counts, and escalation history.
- **Actual behavior before fix:** Laravel could not invoke `monitoringIndex`; the route failed with a server error.
- **Fix applied:** Implemented the endpoint with department scoping based solely on the authenticated Department Head profile, active LGU assignment filtering, grouped status counts, eager-loaded handlers and external escalation history, and 10-item pagination. Regression tests cover response data, isolation, authorization, pagination, status totals, and empty results.

### BUG-002 — Work-start authorization could use a stale assignment (FIXED)

- **Severity:** MEDIUM
- **Status:** FIXED
- **Module:** Department Personnel workflow / authorization
- **Exact file:** `backend/app/Http/Controllers/Api/DepartmentComplaintController.php:225`
- **Function/component:** `DepartmentComplaintController::startWork`
- **Description:** At audit time, the method checked the active assignment before opening its transaction. After locking the complaint, it checked only that the complaint remained `assigned`; it did not re-read and lock an active assignment belonging to the caller. `assignPersonnel` can end that assignment and reassign the complaint while preserving `assigned` status.
- **Why it is a bug:** A request that passed the initial check can start work after the caller is no longer the active assignee, recording an unauthorized status transition and history event.
- **Steps to reproduce:** Start a request as Department Personnel and let it pass the initial assignment check; concurrently have the Department Head reassign that complaint to another person before the first request locks the complaint. The first request then proceeds against the stale assignment.
- **Expected behavior:** The transaction should return `403` and make no status/history change if the caller is no longer actively assigned.
- **Actual behavior before fix:** The transaction accepted stale authorization if the complaint was still `assigned`.
- **Fix applied:** Under the complaint lock, the transaction now also locks and rechecks the caller's active assignment, assignment level, and department before updating status. Regression tests cover both starting work with an active assignment and rejecting an ended assignment without status/history changes. The Barangay Head start-work path already follows the in-transaction recheck pattern.

### BUG-003 — Citizen notifications were always rendered as an empty list (FIXED)

- **Severity:** MEDIUM
- **Status:** FIXED
- **Module:** Feedback and notifications / frontend API response handling
- **Exact files:** `backend/app/Http/Controllers/Api/NotificationController.php:30-38`; `frontend/src/lib/api.js:476-480`; `frontend/src/pages/citizen/ComplaintNotification.jsx:94-101`
- **Function/component:** `NotificationController::index`, `getCitizenNotifications`, `ComplaintNotification`
- **Description:** The API returns `data` as a Laravel paginator object, whose notification array is nested under `data.data`. The API helper previously returned the paginator object itself (`result.data`), and the page accepted only an array, so it replaced the result with `[]`.
- **Why it is a bug:** Existing notifications cannot be displayed or marked read from the citizen notifications page, even though the unread-count endpoint can report a non-zero count.
- **Steps to reproduce:** Create any notification for a citizen, sign in as that citizen, and open `/citizen/notifications`.
- **Expected behavior:** The page lists the citizen's notifications and allows read-state updates.
- **Actual behavior before fix:** The page showed its empty state because the received value was an object, not an array.
- **Fix applied:** `getCitizenNotificationsPage` extracts the paginator records and pagination metadata; the page retains loading/error handling, read actions, unread-count updates, and previous/next pagination controls. The API returns 10 records per page.
- **Verification at original audit:** Mocked-response checks passed for paginated data, an empty paginator, and legacy array shapes. Later frontend regression tests use Vitest; no tests were rerun for this documentation update.

### BUG-004 — Department Heads are denied evidence for assignments addressed to them (FIXED)

- **Severity:** MEDIUM
- **Status:** FIXED and verified locally.
- **Module:** Complaint evidence / authorization
- **Exact file:** `backend/app/Http/Controllers/Api/ComplaintAttachmentController.php:85-101`
- **Function/component:** `ComplaintAttachmentController::signedUrl`
- **Description:** The Department Head branch authorizes only when the active assignee is a Department Personnel member of the Head's department. It does not authorize the Head when the active assignment's `assigned_to` is the Head themself, which is a valid initial routing state.
- **Why it is a bug:** A Department Head responsible for an LGU-level complaint cannot access its evidence using the signed-URL API until it is reassigned to personnel.
- **Steps to reproduce:** Route an LGU-level complaint with evidence to its Department Head, then request `/api/complaint-attachments/{attachmentId}/signed-url` as that Head.
- **Expected behavior:** An active Department Head authorized for the complaint's department can access its evidence.
- **Actual behavior before fix:** The endpoint returned `403` because the query required an assigned profile with role `Department_Personnel`.
- **Fix applied:** The Department Head authorization requires an active `lgu` assignment for the complaint in the Head's department and allows either the Head or Department Personnel in that department to be the assignee. Feature tests cover direct and personnel assignments, ended/cross-department assignments, invalid IDs, and existing role permissions.
- **Verification:** Targeted tests passed (12 tests, 21 assertions). Final local backend verification passed (103 tests, 332 assertions). The fixture includes both attachment tables so the controller's regular-then-resolution attachment lookup is exercised without changing schema migrations or contacting storage.

### BUG-005 — Priority lacked an LGU Staff review workflow (FIXED)

- **Severity:** MEDIUM
- **Status:** FIXED
- **Module:** Complaint management / priority assignment
- **Exact files:** `backend/app/Http/Controllers/Api/ComplaintController.php`; `backend/app/Http/Controllers/Api/StaffComplaintController.php`; `frontend/src/pages/staff/ComplaintReview.jsx`; `frontend/src/lib/api.js`; `docs/api-contract.md`
- **Function/component:** `ComplaintController::store`, `StaffComplaintController::review`, `ComplaintReview`
- **Description:** At audit time, citizen creation hardcoded priority to `medium` and no authorized staff priority-assignment flow existed.
- **Why it is a bug:** LGU Staff could not distinguish or set low, high, or urgent priorities during complaint review.
- **Steps to reproduce:** Submit a complaint with `priority: urgent`; before remediation, its stored priority remained `medium`, and staff had no review control to assign another value.
- **Expected behavior:** Citizens cannot set priority; LGU Staff assign a valid priority as part of the review workflow.
- **Actual behavior before fix:** New complaints were always medium and there was no staff priority control.
- **Fix applied:** Starting review now requires a priority from the schema-constrained values (`low`, `medium`, `high`, `urgent`); staff may optionally update priority when accepting or declining an under-review complaint. The staff review page shows current priority and allows selection at those stages. Citizen creation still writes `medium` regardless of submitted priority. Added feature tests verify defaults, rejected citizen/staff authorization bypass, persistence, invalid values, and review transitions.
- **Verification:** Targeted priority tests passed (8 tests, 29 assertions); full backend suite passed (91 tests, 292 assertions); production frontend build and targeted ESLint passed. No schema change was made.

### BUG-006 — Feedback ownership was not enforced by the database schema (source migration added)

- **Severity:** LOW
- **Module:** Database integrity / feedback
- **Exact files:** `backend/database/migrations/2026_10_16_075426_create_feedback_table.php`; `backend/database/migrations/2026_11_23_000001_enforce_feedback_complaint_ownership.php`
- **Function/component:** Feedback table migration
- **Pre-migration behavior:** The original feedback-table migration added separate foreign keys for `feedback.complaint_id` and `feedback.citizen_id`. Those constraints verified that each reference existed independently, but did not require the citizen to own the referenced complaint; mismatched rows from other write paths could pass those constraints.
- **Why it is a bug:** Such rows can misattribute feedback in future queries or administrative reporting and conflict with the normalized database design, which derives the owner from `complaints.citizen_id`.
- **Pre-migration reproduction:** In an isolated database using only the original feedback schema, create two profiles and a complaint owned by the first, then insert feedback for that complaint with the second profile's `citizen_id`. The two independent foreign keys alone permit the mismatched ownership relationship.
- **Expected behavior:** A successfully migrated database rejects feedback whose `citizen_id` does not match the complaint owner.
- **Post-migration source behavior:** The repository contains the additive migration `2026_11_23_000001_enforce_feedback_complaint_ownership.php`. It first checks for inconsistent or orphaned references and aborts without applying enforcement if any are found. On PostgreSQL it adds a composite unique key and composite foreign key; on SQLite it creates ownership-checking triggers. After this migration completes successfully, the database is intended to reject mismatched ownership on feedback writes (and, for SQLite, complaint-owner changes that would invalidate existing feedback).
- **API behavior verified:** The current API already queried the complaint by both its ID and authenticated citizen ID, stored `citizen_id` from that profile, enforced resolved-only eligibility, and rejected duplicates. Added regression tests confirm own-complaint success, cross-citizen rejection without detail leakage, spoofed `citizen_id` resistance, role restrictions, eligibility, and duplicate protection. No controller change was necessary.
- **Repository versus deployment status:** The migration file exists in the repository. This report did not execute it against any deployed database or inspect a database's migration history/schema, and did not verify enforcement through live database behavior. Whether it has been applied to any particular database is therefore **UNVERIFIED**; do not infer deployed enforcement from the file's presence.

### BUG-007 — Evidence preview state update violated the React Hooks lint rule

- **Severity:** LOW
- **Module:** Frontend / complaint form
- **Exact file:** `frontend/src/pages/citizen/CreateComplaint.jsx`
- **Resolution:** Preview URLs are created by the evidence selection/application handlers and passed to `EvidencePicker`; effects only revoke replaced URLs.
- **Verification:** Targeted ESLint, full `npm run lint`, and `npm run build` all passed. Build emitted only the existing large-chunk warning.

### BUG-008 — Duplicate active Barangay Head creation is reported as a server error

- **Severity:** LOW
- **Module:** Staff account administration / database constraints
- **Exact files:** `backend/app/Http/Controllers/Api/StaffAccountController.php`; `backend/database/migrations/2026_11_10_210916_add_one_active_barangay_head_per_barangay_unique_index.php`
- **Function/component:** `StaffAccountController::store`
- **Root cause:** `store` did not pre-check for an active Barangay Head, and the database-exception handler recognized only the Department Head partial unique index. Thus the active-head database constraint could fall through to a generic `500`.
- **Resolution:** The endpoint now returns `409` with a clear message when the barangay already has an active head. The existing unique index remains in place and its concurrent-insert violation is translated to the same `409`; cleanup of the newly invited Auth user is attempted.
- **Behavior preserved:** Inactive heads do not block a replacement active head. No reactivation endpoint exists in the inspected staff-account routes.
- **Verification:** See the targeted and full backend test results below.

### Unscored requirement and documentation conflicts

These are confirmed inconsistencies, but the workflow document marks key decisions as proposed/pending team confirmation, so they are not counted as bugs until the source of truth is agreed:

1. **Resolved product decision:** The approved complaint lifecycle is `submitted`, `under_review`, `accepted`, `declined`, `assigned`, `in_progress`, and `resolved`. `resolved` is final; there is no separate closure step. `pending_review` belongs exclusively to `complaint_resolutions.review_status`; while that review is pending or returned, the complaint remains `in_progress`. The workflow, API, database-design, and ERD documents now state this lifecycle. The source constraints and resolution controller follow the same distinction; deployed database state remains unverified.
2. `docs/database-design.md:66` refers to `2026_11_09_000004_normalize_feedback_owner_reference.php`, which is absent from the source migration directory; the current feedback migration still has `citizen_id`.
3. Complaint IDs are UUIDs; no dedicated human-readable tracking-number field or generation path was found. A separate tracking-number requirement is **UNVERIFIED**.

## C. PRD Compliance

No file matching a PRD was found. The following comparison uses the repository's draft API/workflow/database documents as evidence only; it is not a formal acceptance of those documents as the PRD.

| PRD Requirement | Implementation Status | Evidence | Bug/Gap |
|---|---|---|---|
| Supabase identity verification and role-based API access | Implemented in source; deployment settings unverified | `VerifySupabaseToken` calls Supabase Auth user endpoint; `CheckRole` and route groups gate roles | Live JWT/OAuth/RLS policy settings and production TLS/CORS/debug settings are **UNVERIFIED**. |
| Citizen profile initialization and onboarding | Implemented | `/profile` creates only a citizen profile; onboarding updates barangay | No issue confirmed. Google OAuth configuration was not tested against a live Supabase project. |
| Complaint submission and evidence | Implemented | Citizen route, server-side validation, Supabase Storage upload, complaint/update records, and optional anonymous submission with response redaction | Citizen priority remains server-defaulted to medium; staff set priority during review (BUG-005). No separate tracking-number field was found. |
| AI complaint assistance | Implemented in source | Authenticated citizen chat endpoint, Groq service, validated draft fields, and normal citizen confirmation/submission flow | Runtime model may be overridden by `GROQ_MODEL`; the deployment value and provider settings were not inspected. |
| LGU-Staff review and complaint routing | Implemented | `/staff/complaints`, review and route handlers; review assigns validated priority | Priority workflow BUG-005 fixed; role flows were not tested against live Supabase data. |
| Department Head dashboard, monitoring and personnel assignment | Implemented in source | Department-scoped queue, monitoring status counts, awaiting-assignment count, and personnel assignment | BUG-001, BUG-002, and BUG-004 are source-fixed; deployed data/configuration is unverified. |
| Barangay Head complaint workflow and escalation | Implemented in backend/web source | Assignment-scoped complaint queue, dashboard summary, start-work, escalation, and resolution routes | No live deployment/data verification. |
| Resolution submission, approval, return, and resubmission | Implemented in backend/web source | Handler submission, LGU-Staff queue/review, approval/return notifications, and approved-resolution citizen response exist | The approved rule keeps the complaint `in_progress` during resolution review and makes `resolved` the final complaint status. Source behavior and lifecycle documentation agree; deployed database state remains unverified. |
| Citizen feedback eligibility and ownership | Implemented in API and source schema | The API scopes complaint lookup to the authenticated citizen; the ownership migration adds a composite database constraint | Migration application and deployed schema remain **UNVERIFIED** (BUG-006). |
| Notifications and read state | Implemented in web source | API supports list/count/read/read-all; citizen notifications page handles paginated data with navigation controls; staff notification UI exists | Live notification data was not inspected. |
| Dashboards, reports, analytics, PDF generation | Implemented in source | Role-specific dashboard endpoints and Staff Reports summary aggregate complaint/resolution records; reports are generated for selected dates | Live-data correctness cannot be verified without authorized DB access. |
| Database relationships, constraints, and migrations | Source migrations present; deployed schema **UNVERIFIED** | 34 Laravel migration files at this review; domain FKs, status checks, indexes, and feedback ownership migration are present in source | Applied migrations, deployed data, and the effective database target remain unverified. No migration was run for this documentation update. |
| React/Vite frontend, API client, validation, and error states | Implemented in source | Role routes, API client, Vitest suite, frontend validation/error handling, and production build configuration are present | Runtime behavior against deployed services remains unverified. |

## D. Safe Checks and Results

| Check | Result | Notes |
|---|---|---|
| `php artisan test --filter=DepartmentPersonnelAssignmentTest` (`backend`) | PASS | 18 tests, 68 assertions, including monitoring authorization, isolation, counts, pagination, and empty results. |
| `php artisan test --filter=ComplaintAttachmentAuthorizationTest` (`backend`) | PASS | 12 tests, 21 assertions; includes direct Head assignment, same-department personnel, ended/cross-department assignment denial, invalid ID, and existing role permissions. |
| `php artisan test --filter=ComplaintPriorityWorkflowTest` (`backend`) | PASS | 8 tests, 29 assertions; covers citizen default/tampering, staff assignment/update, invalid values, unauthorized roles, and status flow. |
| `php artisan test --filter=FeedbackOwnershipTest` (`backend`) | PASS | 6 tests, 18 assertions; regression tests cover owner-only feedback, spoofed citizen ID, role, eligibility, and duplicate enforcement. |
| `php artisan test --filter=BarangayHeadAccountTest` (`backend`) | PASS | 6 tests, 22 assertions; covers successful creation, same- and cross-barangay uniqueness, inactive heads, unauthorized roles, and a simulated unique-index race without leaking DB details. |
| `php artisan test` (`backend`) | PASS | 103 tests, 332 assertions; frontend behavior was checked separately with mocked responses. |
| Mocked notification response parsing (`frontend`) | PASS | Paginated records, empty paginator, legacy data array, and legacy notifications array all returned the expected arrays. |
| `.\node_modules\.bin\eslint.cmd src/pages/citizen/CreateComplaint.jsx` (`frontend`) | PASS | Targeted lint after BUG-007 preview-state correction. |
| `npm run lint` (`frontend`) | PASS | Full frontend lint passed after BUG-007 remediation. |
| `npm run build` (`frontend`) | PASS | Vite build succeeded; it emitted a warning that the main minified JS chunk exceeds 500 kB. |
| `npx eslint src/lib/api.js src/pages/staff/ComplaintReview.jsx` (`frontend`) | PASS | Targeted lint for the priority API/UI changes. |
| Live Supabase Auth, Storage, RLS, database schema/data | **UNVERIFIED** | No live services or production records were accessed. |

## E. Audit Limitations and Handling

- The audit used source and repository documentation only; it did not inspect live Supabase tables, policies, Storage buckets, OAuth provider configuration, or production hosting settings.
- The repository worktree contained pre-existing modifications and untracked files. Follow-up fixes modified `DepartmentComplaintController.php` and `DepartmentPersonnelAssignmentTest.php` for BUG-002, `api.js` and `ComplaintNotification.jsx` for BUG-003, and staff review/API/controller/docs plus `ComplaintPriorityWorkflowTest.php` for BUG-005; other pre-existing changes were left untouched. No migration was executed against the deployed database as part of the original audit or the 2026-11-23 source-alignment review. The repository contains the BUG-006 ownership-enforcement migration described above; its execution against any particular database and live enforcement remain unverified.
- A security-review pass found the single authorization race listed as BUG-002. Other security controls reviewed included server-side Supabase token validation, role checks, record scoping, evidence signed URLs, and secret handling; deployed configuration remains **UNVERIFIED**.
- Tests and builds were run locally and did not connect to production data. No migration, reset, data deletion, or live API request was performed.
