# BantaySerbisyo — Normalized Database Design

**Design baseline:** PostgreSQL on Supabase, managed through Laravel migrations.
**Authority for workflow:** `docs/workflow-rule.md`
**Important:** This document describes the intended logical schema and identifies differences in the current source migrations/models. It does not verify or change the live Supabase database. The deployed schema must be inspected and reconciled through reviewed, additive migrations.

## 1. Design decisions

- Use one profile table for citizens and staff. Supabase Auth owns authentication; `profiles.id` is the Auth user UUID. Do not also use Laravel's `users` table for the same people.
- Use foreign keys to category, barangay, department, and profile records rather than copying their names into complaints.
- Keep repeated or time-varying facts in child tables: attachments, assignments, status history, resolutions, escalations, and feedback.
- Use lowercase `snake_case` values in storage. The exact complaint statuses are `submitted`, `under_review`, `accepted`, `declined`, `assigned`, `in_progress`, and `resolved`. `resolved` is final; there is no separate closure step or `closed` complaint status. Resolution review statuses are `pending_review`, `approved`, and `returned`; `pending_review` is not a complaint status. `transferred` is an assignment/escalation event, not a complaint status. `rejected` is not an allowed status.
- Keep the existing stable code lists as checked strings. Lookup tables for role, priority, status, assignment level, or resolution status are not required for normalization; introduce one only if those values need independent metadata or administration.
- Preserve history. Reassignment creates/ends assignment rows; resolution resubmission creates a new resolution row; status changes create history rows.

## 2. Final application tables

| Table | Purpose and key relationships |
|---|---|
| `profiles` | Auth-linked people; PK `id`; unique email; role; optional FK to barangay and department; `is_active`. |
| `barangays` | Barangay reference data; PK `id`; unique name and optional unique code. |
| `departments` | Department reference data; PK `id`; unique name and optional description. |
| `complaint_categories` | Category reference data; PK `id`; unique name, description, active flag. |
| `complaints` | Current complaint; PK `id`; required FK `citizen_id → profiles`; non-null `is_anonymous` boolean defaulting to false; category/barangay FKs; title, description, priority, current status, handling level, decline reason. |
| `complaint_attachments` | Original complaint evidence; FK to complaint and uploader plus storage path and file metadata. Actual file bytes stay in Supabase Storage. |
| `complaint_assignments` | Assignment history; FK to complaint, assignee, assigner; assignment level, handling-unit FK (`barangay_id` or `department_id`), assigned/ended timestamps, notes. |
| `complaint_updates` | Append-only status history; FK to complaint and actor; previous/new status, comment, timestamp. |
| `complaint_resolutions` | One row per resolution submission; FK to complaint and submitter; description, review status, optional reviewer/comment, submitted/reviewed timestamps. A return followed by resubmission creates another row. |
| `complaint_resolution_attachments` | Resolution evidence; FK to one resolution and uploader plus storage path and file metadata. It does not duplicate the complaint ID because the resolution already identifies its complaint. |
| `complaint_escalations` | One row per escalation event; FK to complaint, requester, origin/destination units and any reviewers/outcome recorder; type, reason, decision/status and timestamps. |
| `feedback` | Logical target: feedback linked to its complaint; rating and comment; unique `complaint_id` means at most one feedback row per complaint, with the owner derived through the complaint. Current source migrations additionally store an independent `citizen_id` FK; see Section 5. |

The framework tables declared in repository migrations are infrastructure, not complaint-domain entities; their definitions are listed in Section 8. The migrator-managed `migrations` repository table has no create-table migration in this repository. The Laravel `users` table currently exists in the default migration; do not treat it as the application's profile source unless the team deliberately changes the authentication architecture.

## 3. Core constraints and rules

- Complaint-domain primary keys are UUIDs; `reports.id` and `report_summaries.id` are auto-incrementing big integers. Keep foreign-key types identical to referenced keys.
- `profiles.email`, reference names, barangay code when present, and `feedback.complaint_id` are unique.
- `priority`: `low`, `medium`, `high`, `urgent`.
- `resolution_level`: null, `barangay`, or `lgu`.
- Complaint status values must match the seven-value complaint lifecycle above in both `complaints` and `complaint_updates`. `resolved` is terminal. `pending_review` is allowed only as a resolution review status. A declined complaint requires a nonblank `rejection_reason`.
- Assignment level determines exactly one handling unit: `barangay` requires `barangay_id` and no `department_id`; `lgu` requires `department_id` and no `barangay_id`.
- Resolution review status: `pending_review`, `approved`, or `returned`. Approval/return records reviewer and time; return requires a comment. A complaint becomes `resolved` only after a resolution is approved.
- Escalation types: `barangay_to_department` and `department_to_higher_authority`. Their origin/destination fields must fit the type. LGU-Staff reviews Barangay Head escalation requests; a Department Head does not.
- Feedback rating is 1–5. The feedback API derives the submitted citizen ID from the authenticated profile and verifies complaint ownership and eligibility. Migration `2026_11_23_000001_enforce_feedback_complaint_ownership.php` adds a composite unique key on `complaints(id, citizen_id)` and a composite FK from `feedback(complaint_id, citizen_id)` to enforce ownership when applied (SQLite uses triggers). Migration-file presence does not verify deployed execution.
- `complaints.is_anonymous` controls response identity visibility only. It does not remove the required owner FK or change complaint ownership, tracking, notifications, or feedback eligibility. Only an authenticated citizen may create a complaint, and the API derives `citizen_id` from that profile.
- Repository migrations define the indexes enumerated in Section 7; they do not add an explicit index for every foreign-key column. Partial unique indexes enforce one active Department Head per department, one active Barangay Head per barangay, and one active assignment per complaint.
- Enforce valid state transitions and role/scope authorization in Laravel. Use transactions when changing current complaint state and writing history/assignment/review records.

## 4. Normalization rationale

- **1NF:** Each field stores one value. Repeating evidence, assignments, status events, resolution attempts, escalation events, and feedback are separate rows, not repeating columns or lists on a complaint.
- **2NF:** Every domain table has a single-column primary key; non-key attributes describe that row. No values depend on only part of a composite key.
- **3NF:** Names and descriptions of categories, barangays, and departments live in their reference tables. Complaints store their IDs. Assignment and review actors are profile IDs. Historical assignment rows retain the handling unit at that time so history does not silently change when a person's current profile changes.

The source schema stores `feedback.citizen_id` as a separate column as well as `feedback.complaint_id`; migration `2026_11_23_000001_enforce_feedback_complaint_ownership.php` couples them with a composite FK on PostgreSQL (or triggers on SQLite). This constraint is only present in a deployed database if the migration ran successfully. The API must still verify that the authenticated citizen owns the complaint. Resolution evidence references only its resolution, so it cannot carry a conflicting complaint ID.

## 5. Current implementation gaps to reconcile

The Laravel migrations create the domain tables, including resolutions and escalations. A source migration separates resolution evidence from original complaint evidence. Source migrations do not confirm what is deployed on Supabase. The following differences must be resolved before calling the deployed database aligned:

1. The current source status constraints use the approved seven complaint statuses, but source migrations do not establish which constraints or data are deployed. Migration `2026_11_09_000002_canonicalize_complaint_statuses.php` rebuilds complaint and complaint-update constraints; it does not map complaint data from `rejected`, `closed`, or `under_review`. Inspect the deployed schema and any existing values before planning a migration or data backfill.
2. Escalation migration and code use `status` and `higher_authority_office`; earlier design text used different names. This document now follows the actual migration field names, with workflow ownership set to LGU-Staff per `workflow-rule.md`.
3. `profiles.role` is free text. Keep role authorization in Laravel. A new partial unique index migration enforces at most one active assignment per complaint; it checks for duplicate active rows and fails with a reconciliation message if any exist.
4. `complaint_assignments` stores both `assignment_level` and a corresponding unit ID. This is a deliberate history snapshot and is constrained so exactly one unit applies.
5. The default Laravel `users` table and Supabase Auth-linked `profiles` coexist in migrations. Confirm Laravel `users` is only framework scaffolding and is not populated as a second identity source.
6. `feedback.citizen_id` remains in the schema and is used by the model/controller. Migration `2026_11_23_000001_enforce_feedback_complaint_ownership.php` enforces that it matches the owner of `feedback.complaint_id`; it first fails if mismatched records exist. Whether this migration has executed on Supabase is unverified.
7. Migration `2026_11_09_000005_separate_resolution_attachments.php` moves resolution evidence into `complaint_resolution_attachments`; it refuses to proceed if a file's complaint and resolution point to different complaints.

## 6. Safe implementation order

1. Align this logical design with the approved workflow and preserve the distinction between complaint statuses and resolution review statuses.
2. Before any schema change, inspect the target database's migration history and status values, and obtain approval for any required legacy-data mappings.
3. Confirm the live Supabase schema and migration history; take a backup before production changes.
4. Review the additive Laravel migrations and apply them to a non-production copy first. Never use a reset/fresh migration against existing data.
5. Verify constraints, representative records, and application behavior before production.

The source migrations are in `backend/database/migrations`. They are Laravel PHP migrations, not a SQL script to paste into Supabase SQL Editor. Use the Laravel migration workflow against the intended PostgreSQL connection after review.

## 7. Migration-backed schema reference

This section records the final schema described by the repository migration sequence, including alterations after each table's creation. Types below are PostgreSQL types emitted by the installed Laravel PostgreSQL grammar for the declared Blueprint types (for example, `string` → `varchar(n)`, `uuid` → `uuid`, and `timestamps()` → nullable `timestamp without time zone`). Laravel's `unsigned*` Blueprint methods map to ordinary PostgreSQL integer types; they do not by themselves create nonnegative CHECK constraints. Runtime schema and migration execution on Supabase have not been inspected.

Legend: `NN` = NOT NULL; `NULL` = nullable; `PK` = primary key; `UQ` = unique. Defaults are database defaults only where explicitly declared by migrations or emitted by Laravel for `useCurrent()`/auto-increment. A column marked `FK` has the referenced key and delete action listed in the relationship table after the column inventory.

### Domain tables

| Table | Column | PostgreSQL type | Null/default/key |
|---|---|---|---|
| `barangays` | `id` | uuid | NN, PK |
| | `name` | varchar(255) | NN, UQ |
| | `code` | varchar(255) | NULL, UQ |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |
| `departments` | `id` | uuid | NN, PK |
| | `name` | varchar(255) | NN, UQ |
| | `description` | varchar(255) | NULL |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |
| `profiles` | `id` | uuid | NN, PK; Auth UUID by application convention, no Auth DB FK declared |
| | `full_name`, `email`, `role` | varchar(255) | NN; `email` UQ; `role` indexed |
| | `barangay_id`, `department_id` | uuid | NULL, FKs |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |
| | `is_active` | boolean | NN, default `true` (added 2026-11-04) |
| `complaint_categories` | `id` | uuid | NN, PK |
| | `name` | varchar(255) | NN, UQ |
| | `description` | text | NULL |
| | `is_active` | boolean | NN, default `true` |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |
| `complaints` | `id` | uuid | NN, PK |
| | `citizen_id`, `category_id`, `barangay_id` | uuid | NN, FKs |
| | `is_anonymous` | boolean | NN, default `false` (added 2026-11-19) |
| | `title` | varchar(255) | NN |
| | `description`, `rejection_reason` | text | `description` NN; `rejection_reason` NULL |
| | `priority`, `status` | varchar(255) | NN; defaults `medium`, `submitted` |
| | `resolution_level` | varchar(255) | NULL |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |
| `complaint_attachments` | `id` | uuid | NN, PK |
| | `complaint_id`, `uploaded_by` | uuid | NN, FKs |
| | `file_path`, `file_name`, `mime_type` | varchar(255) | NN |
| | `file_size` | bigint | NN |
| | `created_at` | timestamp without time zone | NN, default current timestamp |
| `complaint_assignments` | `id` | uuid | NN, PK |
| | `complaint_id`, `assigned_to`, `assigned_by` | uuid | NN, FKs |
| | `assignment_level` | varchar(255) | NN |
| | `barangay_id`, `department_id` | uuid | NULL, FKs added 2026-11-06 |
| | `notes` | text | NULL |
| | `assigned_at` | timestamp without time zone | NN, default current timestamp |
| | `ended_at` | timestamp without time zone | NULL |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |
| `complaint_updates` | `id` | uuid | NN, PK |
| | `complaint_id`, `updated_by` | uuid | NN, FKs |
| | `old_status` | varchar(255) | NULL |
| | `new_status` | varchar(255) | NN |
| | `comment` | text | NULL |
| | `created_at` | timestamp without time zone | NN, default current timestamp |
| `complaint_resolutions` | `id` | uuid | NN, PK |
| | `complaint_id`, `submitted_by` | uuid | NN, FKs |
| | `resolution_description` | text | NN |
| | `review_status` | varchar(255) | NN, default `pending_review` |
| | `reviewed_by` | uuid | NULL, FK |
| | `review_comment` | text | NULL |
| | `submitted_at` | timestamp without time zone | NN, default current timestamp |
| | `reviewed_at` | timestamp without time zone | NULL |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |
| | `completed_at` | date | NULL (added 2026-11-18; API requires it on submission) |
| `complaint_resolution_attachments` | `id` | uuid | NN, PK |
| | `resolution_id`, `uploaded_by` | uuid | NN, FKs |
| | `file_path`, `file_name`, `mime_type` | varchar(255) | NN |
| | `file_size` | bigint | NN |
| | `created_at` | timestamp without time zone | NN, default current timestamp |
| | `evidence_type` | varchar(20) | NN, default `supporting` (added 2026-11-18) |
| `complaint_escalations` | `id` | uuid | NN, PK |
| | `complaint_id`, `requested_by` | uuid | NN, FKs |
| | `escalation_type` | varchar(255) | NN |
| | `origin_barangay_id`, `origin_department_id`, `destination_department_id` | uuid | NULL, FKs |
| | `higher_authority_office` | varchar(255) | NULL |
| | `reason` | text | NN |
| | `status` | varchar(255) | NN, default `pending` |
| | `reviewed_by`, `outcome_recorded_by` | uuid | NULL, FKs |
| | `review_comment`, `outcome_notes` | text | NULL |
| | `reviewed_at`, `outcome_recorded_at` | timestamp without time zone | NULL |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |
| `feedback` | `id` | uuid | NN, PK |
| | `complaint_id` | uuid | NN, UQ, FK; also participates in composite owner FK |
| | `citizen_id` | uuid | NN, FK; also participates in composite owner FK |
| | `rating` | smallint | NN (declared unsignedTinyInteger; PostgreSQL type is smallint) |
| | `comment` | text | NULL |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |
| `notifications` | `id` | uuid | NN, PK |
| | `profile_id` | uuid | NN, FK |
| | `complaint_id` | uuid | NULL, FK |
| | `title`, `type` | varchar(255), varchar(50) | NN |
| | `message` | text | NN |
| | `is_read` | boolean | NN, default `false` |
| | `read_at` | timestamp with time zone | NULL |
| | `created_at`, `updated_at` | timestamp with time zone | NULL |
| `reports` | `id` | bigserial / bigint | NN, PK, generated identity sequence |
| | `report_number` | varchar(20) | NULL, UQ |
| | `generated_by` | uuid | NN, FK |
| | `date_from`, `date_to` | date | NN |
| | `file_path` | text | NULL |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |
| `report_summaries` | `id` | bigserial / bigint | NN, PK, generated identity sequence |
| | `report_id` | bigint | NN, FK |
| | `summary_type` | varchar(20) | NN |
| | `label` | varchar(150) | NN |
| | `category_id` | uuid | NULL, FK |
| | `total`, `received`, `resolved` | integer | NULL (declared unsigned integer; PostgreSQL type is integer) |
| | `month` | date | NULL |
| | `created_at`, `updated_at` | timestamp without time zone | NULL |

### Domain foreign keys, delete actions, indexes, and checks

| Table / constraint | Reference or rule |
|---|---|
| `profiles.barangay_id` | `barangays.id`, `ON DELETE SET NULL`; `profiles.department_id` → `departments.id`, `ON DELETE SET NULL` |
| `complaints.citizen_id` | `profiles.id`, `ON DELETE RESTRICT`; `category_id` → `complaint_categories.id`, RESTRICT; `barangay_id` → `barangays.id`, RESTRICT |
| `complaint_attachments.complaint_id` | `complaints.id`, CASCADE; `uploaded_by` → `profiles.id`, RESTRICT |
| `complaint_assignments.complaint_id` | `complaints.id`, CASCADE; `assigned_to`, `assigned_by` → `profiles.id`, RESTRICT; later `barangay_id` → `barangays.id`, RESTRICT and `department_id` → `departments.id`, RESTRICT |
| `complaint_updates.complaint_id` | `complaints.id`, CASCADE; `updated_by` → `profiles.id`, RESTRICT |
| `complaint_resolutions.complaint_id` | `complaints.id`, CASCADE; `submitted_by`, `reviewed_by` → `profiles.id`, RESTRICT |
| `complaint_resolution_attachments.resolution_id` | `complaint_resolutions.id`, CASCADE; `uploaded_by` → `profiles.id`, RESTRICT. Created by the 2026-11-09 split migration; original attachment `resolution_id` is then removed. |
| `complaint_escalations.complaint_id` | `complaints.id`, CASCADE; `requested_by`, `reviewed_by`, `outcome_recorded_by` → `profiles.id`, RESTRICT; origin/destination barangay/department references → their tables, RESTRICT |
| `feedback.complaint_id` | `complaints.id`, CASCADE; `citizen_id` → `profiles.id`, RESTRICT; later composite FK `(complaint_id, citizen_id)` → `complaints(id, citizen_id)` with CASCADE, plus unique `complaints(id, citizen_id)`. The migration preflights mismatches. SQLite uses triggers and a unique index instead of this PostgreSQL FK. |
| `notifications.profile_id` | `profiles.id`, RESTRICT; nullable `complaint_id` → `complaints.id`, SET NULL |
| `reports.generated_by` | `profiles.id`, RESTRICT |
| `report_summaries.report_id` | `reports.id`, CASCADE; nullable `category_id` → `complaint_categories.id`, RESTRICT |
| Complaint CHECK constraints | `complaints.status` and `complaint_updates.old_status/new_status`: the seven lifecycle values in Section 1; declined complaint requires nonblank rejection reason. Priority is low/medium/high/urgent; resolution level is NULL/barangay/lgu. Later migrations restore these canonical checks; `pending_review` is not a complaint status. |
| Assignment CHECK and unique index | `assignment_level` is barangay/lgu; handling-unit check requires exactly barangay_id for barangay and department_id for lgu. Partial unique index permits at most one row per complaint with `ended_at IS NULL`. |
| Resolution CHECK | `review_status` in pending_review/approved/returned. `completed_at` is nullable at database level although API validation requires it for new submissions. |
| Escalation CHECKs | Type in barangay_to_department/department_to_higher_authority; status in pending/accepted/redirected/completed; route CHECK enforces matching origin/destination fields and nonblank higher-authority office for the external type. |
| Feedback CHECK/unique | `rating BETWEEN 1 AND 5`; `complaint_id` unique, allowing at most one row per complaint. Composite owner constraint is a later migration, not part of the base create migration. |
| Report summary CHECK (PostgreSQL only) | `summary_type` status/category/month enforces which category/total/month/received/resolved fields may be NULL and nonnegative values; monthly date must be day 1. |
| Role partial unique indexes | At most one active `Department_Head` per non-NULL department and one active `Barangay_Head` per non-NULL barangay. These are partial unique indexes on `profiles`, not model-only rules. |
| Unique constraints | Barangay name/code, department name, profile email, category name, report number (nullable), feedback complaint_id, report summary (report_id, summary_type, label), (report_id, category_id), and (report_id, month). PostgreSQL permits multiple NULL values in nullable unique columns under its default semantics. |
| Domain/application indexes | Complaints: citizen/category/barangay/status/created_at. Assignments: (complaint_id, assigned_at), (assigned_to, ended_at), assignment_level, plus active partial unique index. Updates: (complaint_id, created_at), updated_by. Attachments: (complaint_id, created_at)/uploaded_by; resolution attachments: (resolution_id, created_at)/uploaded_by. Resolutions: (complaint_id, submitted_at), submitted_by, review_status. Escalations: (complaint_id, status), (destination_department_id, status), requested_by. Notifications: profile_id+created_at, profile_id+is_read. Reports: date_from+date_to. Report summaries: report_id+summary_type. Also `profiles.role` and `feedback.citizen_id`. |
| Framework/support-table indexes | These are listed with their owning tables in Section 8: cache/cache_locks expiration; jobs queue; failed_jobs (connection, queue, failed_at); personal_access_tokens token uniqueness, tokenable morph index, and expires_at. They are not application-domain indexes. |

## 8. Framework tables and migration-defined support tables

These are migration-created framework tables, not complaint-domain entities. Laravel's migration repository table is managed by the migrator and has no create-table migration in this repository.

| Table | Migration-defined columns and constraints |
|---|---|
| `users` | `id` bigserial PK; `name` varchar(255) NN; `email` varchar(255) NN UQ; `email_verified_at` timestamp NULL; `password` varchar(255) NN; `remember_token` varchar(100) NULL; `created_at`, `updated_at` timestamp NULL. |
| `password_reset_tokens` | `email` varchar(255) PK; `token` varchar(255) NN; `created_at` timestamp NULL. |
| `sessions` | `id` varchar(255) PK; `user_id` bigint NULL indexed, no FK declared; `ip_address` varchar(45) NULL; `user_agent` text NULL; `payload` text (Laravel longText maps to text on PostgreSQL) NN; `last_activity` integer NN indexed. |
| `cache` | `key` varchar(255) PK; `value` text NN; `expiration` bigint NN indexed. |
| `cache_locks` | `key` varchar(255) PK; `owner` varchar(255) NN; `expiration` bigint NN indexed. |
| `jobs` | `id` bigserial PK; `queue` varchar(255) NN indexed; `payload` text NN; `attempts` smallint NN; `reserved_at` integer NULL; `available_at`, `created_at` integer NN. |
| `job_batches` | `id` varchar(255) PK; `name` varchar(255), `total_jobs`, `pending_jobs`, `failed_jobs` integers NN; `failed_job_ids` text NN; `options` text NULL; `cancelled_at` integer NULL; `created_at` integer NN; `finished_at` integer NULL. |
| `failed_jobs` | `id` bigserial PK; `uuid` varchar(255) NN UQ; `connection`, `queue` varchar(255) NN; `payload`, `exception` text NN; `failed_at` timestamp NN default current timestamp; index (connection, queue, failed_at). |
| `personal_access_tokens` | `id` bigserial PK; `tokenable_type` varchar(255) NN, `tokenable_id` bigint NN, composite morph index (no FK); `name` text NN; `token` varchar(64) NN UQ; `abilities` text NULL; `last_used_at`, `expires_at` timestamp NULL (expires_at indexed); `created_at`, `updated_at` timestamp NULL. This table exists in migrations but the API authentication route middleware uses Supabase tokens. |

`migrations` is created and managed by Laravel's migrator at runtime rather than by a repository migration file; its concrete deployed shape and contents are not established here.

Migration order matters: initial domain tables are created in timestamp order; resolutions follow complaints; the attachment-to-resolution link is temporarily added and later split into its own table; assignment handling-unit columns/check follow the assignment base table; profile activity precedes partial head indexes; feedback ownership is the latest migration and depends on both `complaints` and `feedback`. Migration source may include later repair/reassertion migrations for the same complaint status checks. This describes the ordered source sequence only, not an assertion that all migrations completed on any database.
