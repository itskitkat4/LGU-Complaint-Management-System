# ERD Guide for BantaySerbisyo

Use this guide to draw the Entity Relationship Diagram (ERD) from the Laravel migrations. It describes the schema currently represented in the migrations, including nullable fields and historical records. Confirm it against the team's approved requirements before proposing schema changes.

## ERD to draw

```mermaid
erDiagram
    BARANGAYS ||--o{ PROFILES : "assigned to"
    DEPARTMENTS ||--o{ PROFILES : "assigned to"
    PROFILES ||--o{ COMPLAINTS : "submits"
    BARANGAYS ||--o{ COMPLAINTS : "filed in"
    COMPLAINT_CATEGORIES ||--o{ COMPLAINTS : "classifies"
    COMPLAINTS ||--o{ COMPLAINT_ATTACHMENTS : "has evidence"
    PROFILES ||--o{ COMPLAINT_ATTACHMENTS : "uploads"
    COMPLAINTS ||--o{ COMPLAINT_ASSIGNMENTS : "assignment history"
    PROFILES ||--o{ COMPLAINT_ASSIGNMENTS : "receives"
    PROFILES ||--o{ COMPLAINT_ASSIGNMENTS : "assigns"
    BARANGAYS o|--o{ COMPLAINT_ASSIGNMENTS : "handling unit"
    DEPARTMENTS o|--o{ COMPLAINT_ASSIGNMENTS : "handling unit"
    COMPLAINTS ||--o{ COMPLAINT_UPDATES : "status history"
    PROFILES ||--o{ COMPLAINT_UPDATES : "records"
    COMPLAINTS ||--o| FEEDBACK : "may receive"
    COMPLAINTS ||--o{ COMPLAINT_RESOLUTIONS : "resolution history"
    PROFILES ||--o{ COMPLAINT_RESOLUTIONS : "submits"
    PROFILES o|--o{ COMPLAINT_RESOLUTIONS : "reviews"
    COMPLAINT_RESOLUTIONS ||--o{ COMPLAINT_RESOLUTION_ATTACHMENTS : "evidence"
    PROFILES ||--o{ COMPLAINT_RESOLUTION_ATTACHMENTS : "uploads"
    COMPLAINTS ||--o{ COMPLAINT_ESCALATIONS : "escalation history"
    PROFILES ||--o{ COMPLAINT_ESCALATIONS : "requests"
    BARANGAYS o|--o{ COMPLAINT_ESCALATIONS : "origin"
    DEPARTMENTS o|--o{ COMPLAINT_ESCALATIONS : "origin or destination"
    PROFILES o|--o{ COMPLAINT_ESCALATIONS : "reviews"
    PROFILES o|--o{ COMPLAINT_ESCALATIONS : "records outcome"

    BARANGAYS {
        uuid id PK
        string name UK
        string code UK "nullable"
    }

    DEPARTMENTS {
        uuid id PK
        string name UK
        string description "nullable"
    }

    PROFILES {
        uuid id PK "Supabase Auth user ID"
        string full_name
        string email UK
        string role
        uuid barangay_id FK "nullable"
        uuid department_id FK "nullable"
        boolean is_active
    }

    COMPLAINT_CATEGORIES {
        uuid id PK
        string name UK
        text description "nullable"
        boolean is_active
    }

    COMPLAINTS {
        uuid id PK
        uuid citizen_id FK
        boolean is_anonymous
        uuid category_id FK
        uuid barangay_id FK
        string title
        text description
        string priority
        string status
        string resolution_level "nullable"
        text rejection_reason "nullable"
    }

    COMPLAINT_ATTACHMENTS {
        uuid id PK
        uuid complaint_id FK
        uuid uploaded_by FK
        string file_path
        string file_name
        string mime_type
        bigint file_size
    }

    COMPLAINT_ASSIGNMENTS {
        uuid id PK
        uuid complaint_id FK
        uuid assigned_to FK
        uuid assigned_by FK
        string assignment_level
        uuid barangay_id FK "nullable"
        uuid department_id FK "nullable"
        text notes "nullable"
        timestamp assigned_at
        timestamp ended_at "nullable means active"
    }

    COMPLAINT_UPDATES {
        uuid id PK
        uuid complaint_id FK
        uuid updated_by FK
        string old_status "nullable"
        string new_status
        text comment "nullable"
    }

    FEEDBACK {
        uuid id PK
        uuid complaint_id FK UK
        smallint rating
        text comment "nullable"
    }

    COMPLAINT_RESOLUTIONS {
        uuid id PK
        uuid complaint_id FK
        uuid submitted_by FK
        text resolution_description
        string review_status
        uuid reviewed_by FK "nullable"
        text review_comment "nullable"
        timestamp submitted_at
        timestamp reviewed_at "nullable"
    }

    COMPLAINT_RESOLUTION_ATTACHMENTS {
        uuid id PK
        uuid resolution_id FK
        uuid uploaded_by FK
        string file_path
        string file_name
        string mime_type
        bigint file_size
    }

    COMPLAINT_ESCALATIONS {
        uuid id PK
        uuid complaint_id FK
        string escalation_type
        uuid requested_by FK
        uuid origin_barangay_id FK "nullable"
        uuid origin_department_id FK "nullable"
        uuid destination_department_id FK "nullable"
        string higher_authority_office "nullable"
        text reason
        string status
        uuid reviewed_by FK "nullable"
        text review_comment "nullable"
        text outcome_notes "nullable"
        uuid outcome_recorded_by FK "nullable"
    }
```

`||` means exactly one, `o|` means zero or one, and `o{` means zero or many. Read each relationship from the entity at the left to the entity at the right. For example, every complaint has exactly one submitting profile, while one profile may submit zero or many complaints.

## Relationship and key checklist

- Every entity has a UUID primary key except `profiles.id`, which is the UUID supplied by Supabase Auth.
- A profile may optionally belong to one barangay and/or one department. Current migrations do not enforce which roles may use those foreign keys.
- Every complaint references one citizen profile, one category, and one barangay.
- A complaint can have multiple assignments, status updates, original attachments, resolutions, and escalations; these rows preserve history. Resolution evidence belongs to a resolution-specific attachment table.
- An assignment references one recipient and one assigning profile. Its handling-unit check requires a barangay for `barangay` assignments or a department for `lgu` assignments.
- A new partial unique index permits at most one assignment with `ended_at IS NULL` per complaint. The migration stops if existing active duplicates need manual reconciliation.
- Each feedback row references one complaint. `feedback.complaint_id` is unique, so a complaint has at most one feedback row; its citizen owner is reached through the complaint.
- Original evidence references its complaint; resolution evidence references its resolution. A file row cannot carry both IDs and accidentally connect unrelated complaints.
- Escalation origin/destination fields are nullable because their valid combination depends on `escalation_type`; the database check enforces those combinations.
- Supabase Auth is an external identity service, not a table in this ERD. The Laravel `users` table is also not connected to `profiles` in the current migrations; include it only if the application intends to use Laravel-managed accounts.

## Normalization outcome

The design is in 3NF for the current application requirements. Atomic evidence, assignment, status, resolution, escalation, and feedback records are separate rows. Reference names live in `complaint_categories`, `barangays`, and `departments`, with their IDs stored in complaint records. Stable controlled values remain checked strings; normalization does not require a lookup table for each small fixed list. See `docs/database-design.md` for the finalized logical design and implementation gaps.

The approved complaint lifecycle follows `docs/workflow-rule.md`: `submitted`, `under_review`, `accepted`, `declined`, `assigned`, `in_progress`, and `resolved`. `resolved` is final; there is no separate `closed` status. `pending_review` belongs only to `complaint_resolutions.review_status`. The source migrations define complaint status constraints, but migration files alone do not establish which migrations have been applied or what values exist in the deployed database.

Keep one feedback row per complaint. The feedback owner is derived from its complaint; the API must verify that the authenticated citizen owns that complaint. The latest source migration removes the duplicated `feedback.citizen_id` after checking that existing values match complaint owners. Resolution attachments reference the resolution directly, avoiding a duplicated complaint ID. Retain inactive reference records so historical complaints remain readable.

## Source files

This ERD reflects Laravel migrations in `backend/database/migrations`; `docs/database-design.md` records the finalized intended design. For the currently deployed schema, inspect Supabase directly and compare its migration history. Source migrations alone do not establish what has been applied remotely.
