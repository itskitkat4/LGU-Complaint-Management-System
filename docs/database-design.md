# BantaySerbisyo — Normalized Database Design

**Design baseline:** PostgreSQL on Supabase, managed through Laravel migrations.
**Authority for workflow:** `docs/workflow-rule.md`
**Important:** This document finalizes the intended logical schema. It does not verify or change the live Supabase database. The deployed schema must be inspected and reconciled through reviewed, additive migrations.

## 1. Design decisions

- Use one profile table for citizens and staff. Supabase Auth owns authentication; `profiles.id` is the Auth user UUID. Do not also use Laravel's `users` table for the same people.
- Use foreign keys to category, barangay, department, and profile records rather than copying their names into complaints.
- Keep repeated or time-varying facts in child tables: attachments, assignments, status history, resolutions, escalations, and feedback.
- Use lowercase `snake_case` values in storage. The complaint lifecycle is `submitted`, `under_review`, `accepted`, `declined`, `assigned`, `in_progress`, `pending_review`, `resolved`. `transferred` is an assignment/escalation event, not a complaint status. Do not use `rejected` or `closed` as alternate names.
- Keep the existing stable code lists as checked strings. Lookup tables for role, priority, status, assignment level, or resolution status are not required for normalization; introduce one only if those values need independent metadata or administration.
- Preserve history. Reassignment creates/ends assignment rows; resolution resubmission creates a new resolution row; status changes create history rows.

## 2. Final application tables

| Table | Purpose and key relationships |
|---|---|
| `profiles` | Auth-linked people; PK `id`; unique email; role; optional FK to barangay and department; `is_active`. |
| `barangays` | Barangay reference data; PK `id`; unique name and optional unique code. |
| `departments` | Department reference data; PK `id`; unique name and optional description. |
| `complaint_categories` | Category reference data; PK `id`; unique name, description, active flag. |
| `complaints` | Current complaint; PK `id`; FKs `citizen_id → profiles`, `category_id → complaint_categories`, `barangay_id → barangays`; title, description, priority, current status, handling level, decline reason. |
| `complaint_attachments` | Original complaint evidence; FK to complaint and uploader plus storage path and file metadata. Actual file bytes stay in Supabase Storage. |
| `complaint_assignments` | Assignment history; FK to complaint, assignee, assigner; assignment level, handling-unit FK (`barangay_id` or `department_id`), assigned/ended timestamps, notes. |
| `complaint_updates` | Append-only status history; FK to complaint and actor; previous/new status, comment, timestamp. |
| `complaint_resolutions` | One row per resolution submission; FK to complaint and submitter; description, review status, optional reviewer/comment, submitted/reviewed timestamps. A return followed by resubmission creates another row. |
| `complaint_resolution_attachments` | Resolution evidence; FK to one resolution and uploader plus storage path and file metadata. It does not duplicate the complaint ID because the resolution already identifies its complaint. |
| `complaint_escalations` | One row per escalation event; FK to complaint, requester, origin/destination units and any reviewers/outcome recorder; type, reason, decision/status and timestamps. |
| `feedback` | Citizen feedback; FK to complaint; rating and comment; unique `complaint_id` means at most one feedback row per complaint. The citizen is derived through the complaint owner. |

Laravel support tables (`migrations`, `cache`, `jobs`, `sessions`, `password_reset_tokens`, `personal_access_tokens`) are framework infrastructure, not part of the complaint domain model. The Laravel `users` table currently exists in the default migration; do not treat it as the application's profile source unless the team deliberately changes the authentication architecture.

## 3. Core constraints and rules

- Primary keys are UUIDs for domain tables. Keep foreign-key types identical to referenced keys.
- `profiles.email`, reference names, barangay code when present, and `feedback.complaint_id` are unique.
- `priority`: `low`, `medium`, `high`, `urgent`.
- `resolution_level`: null, `barangay`, or `lgu`.
- Complaint status values must match the lifecycle above in both `complaints` and `complaint_updates`. A declined complaint requires a nonblank `rejection_reason`.
- Assignment level determines exactly one handling unit: `barangay` requires `barangay_id` and no `department_id`; `lgu` requires `department_id` and no `barangay_id`.
- Resolution review status: `pending_review`, `approved`, or `returned`. Approval/return records reviewer and time; return requires a comment. A complaint becomes `resolved` only after a resolution is approved.
- Escalation types: `barangay_to_department` and `department_to_higher_authority`. Their origin/destination fields must fit the type. LGU-Staff reviews Barangay Head escalation requests; a Department Head does not.
- Feedback rating is 1–5. API authorization must ensure the feedback citizen is the complaint's citizen and feedback is allowed by the workflow.
- Create indexes for foreign keys and common list filters. Preserve the current useful indexes on complaint status/date, complaint ownership, assignment active state, and pending escalation destination. Partial unique indexes enforce one active Department Head per department and one active assignment per complaint.
- Enforce valid state transitions and role/scope authorization in Laravel. Use transactions when changing current complaint state and writing history/assignment/review records.

## 4. Normalization rationale

- **1NF:** Each field stores one value. Repeating evidence, assignments, status events, resolution attempts, escalation events, and feedback are separate rows, not repeating columns or lists on a complaint.
- **2NF:** Every domain table has a single-column primary key; non-key attributes describe that row. No values depend on only part of a composite key.
- **3NF:** Names and descriptions of categories, barangays, and departments live in their reference tables. Complaints store their IDs. Assignment and review actors are profile IDs. Historical assignment rows retain the handling unit at that time so history does not silently change when a person's current profile changes.

The feedback owner is obtained from `feedback.complaint_id → complaints.citizen_id`, so it is not duplicated in `feedback`. The API must still verify that the authenticated citizen owns that complaint. Resolution evidence references only its resolution, so it cannot carry a conflicting complaint ID.

## 5. Current implementation gaps to reconcile

The Laravel migrations create the domain tables, including resolutions and escalations. New additive migrations separate resolution evidence from original complaint evidence and remove redundant owner data from feedback. Source migrations do not confirm what is deployed on Supabase. The following differences must be resolved before calling the deployed database aligned:

1. The historical migrations allowed overlapping complaint statuses (`declined`/`rejected`, `accepted` behavior, `closed`). The current application now uses the workflow lifecycle, and migration `2026_11_09_000002_canonicalize_complaint_statuses.php` maps `rejected` to `declined`, `closed` to `resolved`, and legacy `under_review` rows with a handling level to `accepted`. Review those mappings against live records before applying it.
2. Escalation migration and code use `status` and `higher_authority_office`; earlier design text used different names. This document now follows the actual migration field names, with workflow ownership set to LGU-Staff per `workflow-rule.md`.
3. `profiles.role` is free text. Keep role authorization in Laravel. A new partial unique index migration enforces at most one active assignment per complaint; it checks for duplicate active rows and fails with a reconciliation message if any exist.
4. `complaint_assignments` stores both `assignment_level` and a corresponding unit ID. This is a deliberate history snapshot and is constrained so exactly one unit applies.
5. The default Laravel `users` table and Supabase Auth-linked `profiles` coexist in migrations. Confirm Laravel `users` is only framework scaffolding and is not populated as a second identity source.
6. Migration `2026_11_09_000004_normalize_feedback_owner_reference.php` removes the redundant `feedback.citizen_id`; it refuses to proceed if stored values disagree with complaint owners. Verify the live Supabase migration history and data before applying it.
7. Migration `2026_11_09_000005_separate_resolution_attachments.php` moves resolution evidence into `complaint_resolution_attachments`; it refuses to proceed if a file's complaint and resolution point to different complaints.

## 6. Safe implementation order

1. Team/adviser confirms this logical design and the canonical workflow statuses.
2. Inspect live Supabase rows, especially legacy complaint statuses and duplicate active assignments, and verify the proposed backfill mappings.
3. Confirm the live Supabase schema and migration history; take a backup before production changes.
4. Review the additive Laravel migrations and apply them to a non-production copy first. Never use a reset/fresh migration against existing data.
5. Verify constraints, representative records, and application behavior before production.

The source migrations are in `backend/database/migrations`. They are Laravel PHP migrations, not a SQL script to paste into Supabase SQL Editor. Use the Laravel migration workflow against the intended PostgreSQL connection after review.
