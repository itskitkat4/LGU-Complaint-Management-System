# BantaySerbisyo — PostgreSQL Database Design

## 1. Purpose

This document describes the existing PostgreSQL database structure for BantaySerbisyo, its relationships, and the proposed changes required to support the approved complaint workflow.

The design prioritizes reusing existing tables, preserving existing records, and introducing only the additional structures required by the final system requirements.

No database changes should be applied until the schema design and workflow rules have been reviewed.

## 2. Existing Database Tabless

### 2.1 `profiles`

**Purpose:** Stores application profiles associated with authenticated users and government personnel.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key; corresponds to the Supabase Auth user ID |
| `full_name` | VARCHAR(255) | Profile name |
| `email` | VARCHAR(255) | Unique email address |
| `role` | VARCHAR(255) | Application role |
| `barangay_id` | UUID, nullable | References `barangays.id` |
| `department_id` | UUID, nullable | References `departments.id` |
| `created_at` | TIMESTAMP, nullable | Creation timestamp |
| `updated_at` | TIMESTAMP, nullable | Last update timestamp |

**Constraints and indexes:**
- Primary key: `id`
- Unique index: `email`
- Index: `role`
- Foreign keys: `barangay_id` and `department_id`

**Design notes:**
- Citizens and authorized staff use the shared profiles table.
- A citizen may have a barangay assignment but does not receive staff permissions.
- Staff access must be based on server-verified identity and authorized role assignments.
- Each barangay has one designated `Barangay_Head` account.
- There is no separate Barangay Personnel role.

### 2.2 `barangays`

**Purpose:** Stores barangay records used for complaint location and jurisdiction.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Unique barangay name |
| `code` | VARCHAR(255), nullable | Unique barangay code |
| `created_at` | TIMESTAMP, nullable | Creation timestamp |
| `updated_at` | TIMESTAMP, nullable | Last update timestamp |

### 2.3 `departments`

**Purpose:** Stores LGU departments or offices.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Unique department name |
| `description` | VARCHAR(255), nullable | Department description |
| `created_at` | TIMESTAMP, nullable | Creation timestamp |
| `updated_at` | TIMESTAMP, nullable | Last update timestamp |

### 2.4 `complaint_categories`

**Purpose:** Stores complaint classifications.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Unique category name |
| `description` | TEXT, nullable | Category description |
| `is_active` | BOOLEAN | Indicates whether the category is active |
| `created_at` | TIMESTAMP, nullable | Creation timestamp |
| `updated_at` | TIMESTAMP, nullable | Last update timestamp |

### 2.5 `complaints`

**Purpose:** Stores the primary complaint record.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `citizen_id` | UUID | References `profiles.id` |
| `category_id` | UUID | References `complaint_categories.id` |
| `barangay_id` | UUID | References `barangays.id` |
| `title` | VARCHAR(255) | Complaint title |
| `description` | TEXT | Complaint description |
| `priority` | VARCHAR(255) | Priority; currently defaults to `medium` |
| `status` | VARCHAR(255) | Current status; currently defaults to `submitted` |
| `resolution_level` | VARCHAR(255), nullable | Handling-level information |
| `rejection_reason` | TEXT, nullable | Reason for declining a complaint |
| `created_at` | TIMESTAMP, nullable | Creation timestamp |
| `updated_at` | TIMESTAMP, nullable | Last update timestamp |

**Existing indexes:** Primary key, citizen, category, barangay, creation timestamp, and status.

**Design notes:**
- Retain this table as the primary complaint record.
- Do not create a duplicate complaint table.
- Laravel must validate permitted status transitions.
- The existing `rejection_reason` field is for complaint decline reasons and should not be reused for resolution return reasons.
- Resolution descriptions and review decisions should be stored separately to preserve multiple submissions.

### 2.6 `complaint_attachments`

**Purpose:** Stores evidence-file metadata and storage paths.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `complaint_id` | UUID | References `complaints.id` |
| `uploaded_by` | UUID | References `profiles.id` |
| `file_path` | VARCHAR(255) | Storage path or object key |
| `file_name` | VARCHAR(255) | Original or display filename |
| `mime_type` | VARCHAR(255) | File media type |
| `file_size` | BIGINT | File size in bytes |
| `created_at` | TIMESTAMP | Upload-record timestamp |

**Design notes:**
- Actual files are stored in Supabase Storage; PostgreSQL stores their metadata and references.
- Evidence access must be authorized.
- The system must distinguish original complaint evidence from resolution evidence.
- A nullable `resolution_id` foreign key is proposed for linking evidence to a specific resolution submission. This change requires review before implementation.

### 2.7 `complaint_assignments`

**Purpose:** Records complaint assignments and reassignments.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `complaint_id` | UUID | References `complaints.id` |
| `assigned_to` | UUID | References `profiles.id` |
| `assigned_by` | UUID | References `profiles.id` |
| `assignment_level` | VARCHAR(255) | Assignment level |
| `notes` | TEXT, nullable | Assignment notes or reason |
| `assigned_at` | TIMESTAMP | Assignment timestamp |
| `ended_at` | TIMESTAMP, nullable | End of assignment |
| `created_at` | TIMESTAMP, nullable | Creation timestamp |
| `updated_at` | TIMESTAMP, nullable | Last update timestamp |

**Design notes:**
- Reuse this table for assignment history.
- Preserve completed assignments rather than deleting them when a complaint is reassigned.
- The backend must consistently end the previous assignment and record the next assignment.
- Assignment authorization depends on the complaint's handling level and the assigning user's role.

### 2.8 `complaint_updates`

**Purpose:** Records complaint status changes and related comments.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `complaint_id` | UUID | References `complaints.id` |
| `updated_by` | UUID | References `profiles.id` |
| `old_status` | VARCHAR(255), nullable | Previous status |
| `new_status` | VARCHAR(255) | New status |
| `comment` | TEXT, nullable | Status-change or review comment |
| `created_at` | TIMESTAMP | Update timestamp |

**Design notes:**
- Reuse this table as status history.
- Record the previous status, new status, responsible user, timestamp, and relevant reason.
- Laravel should update the complaint and insert the corresponding history record within a database transaction.
- Resolution-specific submissions and review decisions must also have their own records.

### 2.9 `feedback`

**Purpose:** Stores citizen feedback associated with complaints.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `complaint_id` | UUID | References `complaints.id` |
| `citizen_id` | UUID | References `profiles.id` |
| `rating` | SMALLINT | Feedback rating |
| `comment` | TEXT, nullable | Optional feedback comment |
| `created_at` | TIMESTAMP, nullable | Creation timestamp |
| `updated_at` | TIMESTAMP, nullable | Last update timestamp |

**Existing constraints:**
- Unique index on `complaint_id`, limiting each complaint to one feedback record.
- Foreign keys to the complaint and citizen profile.

**Design notes:**
- Laravel must validate the permitted rating range.
- Only the authorized citizen associated with an eligible complaint may submit feedback.
- Feedback eligibility must follow the approved complaint workflow.

## 3. Proposed New Table: `complaint_resolutions`

**Purpose:** Preserves every resolution submission and its review decision.

A complaint may have multiple resolution records because LGU-Staff may return a proposed resolution for additional work.

| Column | Proposed type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `complaint_id` | UUID | Foreign key to `complaints.id` |
| `submitted_by` | UUID | Foreign key to `profiles.id` |
| `resolution_description` | TEXT | Action taken and outcome |
| `review_status` | VARCHAR(255) | Proposed values: `Pending Review`, `Approved`, `Returned` |
| `reviewed_by` | UUID, nullable | Foreign key to `profiles.id`; LGU-Staff reviewer |
| `review_comment` | TEXT, nullable | Review comments or return reason |
| `submitted_at` | TIMESTAMP | Submission time |
| `reviewed_at` | TIMESTAMP, nullable | Review time |
| `created_at` | TIMESTAMP | Record creation |
| `updated_at` | TIMESTAMP | Last update |

### Relationships

- One complaint can have many resolution submissions.
- One profile can submit many resolutions.
- One authorized reviewer can review many resolutions.
- Each resolution submission belongs to one complaint.
- Resolution evidence should be associated with the relevant resolution record.

### Required rules

1. Create a new resolution record for every submission.
2. Do not overwrite a returned resolution when a handler resubmits.
3. Only authorized handlers may submit resolutions for complaints they are permitted to handle.
4. Only LGU-Staff may approve or return a resolution.
5. A returned resolution must have a review comment explaining the required additional work.
6. An approved resolution must record the reviewer and review timestamp.
7. The complaint may become `Resolved` only after its applicable resolution has been approved.
8. Keep the previous resolution submissions and review decisions available for authorized audit.
9. Enforce workflow operations through Laravel authorization, validation, and database transactions.

The final table definition, constraints, and indexes must be confirmed against the approved ERD before migration.

## 4. Proposed Evidence Relationship

The existing `complaint_attachments` table should remain the primary file-metadata table.

Two designs are possible:

**Option A — Nullable `resolution_id` on `complaint_attachments`**

- Simple to implement.
- Original complaint evidence can leave `resolution_id` null.
- Resolution evidence references the applicable resolution.

**Option B — Separate resolution-evidence linking table**

- Useful if the project later requires more flexible evidence relationships.
- Requires an additional table and more relationship management.

The recommended initial design is Option A, provided each attachment belongs to at most one resolution submission. This remains subject to team review.

## 5. Proposed Complaint Status Lifecycle

The proposed complaint statuses are:

1. `Submitted`
2. `Under Review`
3. `Accepted`
4. `Declined`
5. `Assigned`
6. `In Progress`
7. `Pending Review`
8. `Resolved`

`Transferred` is not a complaint status in the proposed workflow. Transfers and reassignments should be recorded as assignment or workflow events.

| Current status | Next status | Authorized role |
|---|---|---|
| Submitted | Under Review | LGU-Staff |
| Under Review | Accepted | LGU-Staff |
| Under Review | Declined | LGU-Staff |
| Accepted | Assigned | Authorized routing role |
| Assigned | In Progress | Assigned handler |
| In Progress | Pending Review | Authorized complaint handler |
| Pending Review | Resolved | LGU-Staff |
| Pending Review | In Progress | LGU-Staff |

Laravel must reject invalid or unauthorized transitions.

## 6. Role and Record-Level Access

| Role | Intended access |
|---|---|
| Citizen | Own profile, complaints, status history, and approved resolution details |
| Barangay_Head | Complaints routed to the assigned barangay and authorized operations |
| LGU-Staff | Authorized complaint review, routing, resolution review, and approval |
| Department_Head | Complaints routed to the assigned department and personnel assignment |
| Department_Personnel | Complaints assigned to them and authorized progress/resolution actions |
| System Administrator | Authorized account, role, category, department, barangay, and configuration management |

The backend must verify identity, role, organizational scope, and complaint-level permissions. Frontend route restrictions alone are insufficient.

## 7. Integrity and Security Requirements

- Preserve existing records during schema changes.
- Use foreign keys for relational integrity.
- Validate role, status, priority, and rating values.
- Enforce authorized transitions in Laravel.
- Use transactions for complaint status changes and associated history records.
- Keep Supabase service-role credentials out of frontend code.
- Protect complaint evidence and use authorized access to Supabase Storage.
- Do not allow a citizen to change complaint status or approve a resolution.
- Preserve assignment, status, resolution, and review history.
- Review database constraints and indexes against actual query patterns before adding them.

## 8. Existing Tables Versus Proposed Changes

| Requirement | Design decision |
|---|---|
| Profiles and roles | Reuse `profiles` |
| Barangays | Reuse `barangays` |
| Departments | Reuse `departments` |
| Complaint categories | Reuse `complaint_categories` |
| Complaints | Reuse `complaints` |
| Original evidence | Reuse `complaint_attachments` |
| Resolution evidence | Proposed nullable `resolution_id` on attachments |
| Assignment history | Reuse `complaint_assignments` |
| Status history | Reuse `complaint_updates` |
| Resolution submissions and decisions | Propose `complaint_resolutions` |
| Citizen feedback | Reuse `feedback` |

Additional transfer, notification, and audit tables are not included in this immediate schema-change proposal. Their need should be reviewed against the approved requirements before implementation.

## 9. Review Checklist

- [ ] Compare all documented columns and constraints with the actual Laravel migration files.
- [ ] Confirm the proposed complaint statuses and transitions.
- [ ] Confirm the role permissions and barangay/LGU routing rules.
- [ ] Review the `complaint_resolutions` table design.
- [ ] Confirm how resolution evidence will be linked.
- [ ] Confirm that assignment and status histories are preserved.
- [ ] Review required indexes and constraints.
- [ ] Obtain team/adviser approval.
- [ ] Prepare minimal migrations only after approval.
- [ ] Verify migrations without resetting or deleting existing data.

## 10. Implementation Status

**Current state:** Existing tables have been inspected. The proposed resolution-history design is documented for review.

**Not yet implemented:** The `complaint_resolutions` table and the optional resolution-evidence relationship.

**Next task:** Finalize Task 2.1 and Task 2.2, then proceed to Task 2.3 — Create API Contract Documentation in `docs/api-contract.md`.

No database changes should be applied until the design is approved.
