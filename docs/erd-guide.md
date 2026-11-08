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
    PROFILES ||--o{ FEEDBACK : "submits"
    COMPLAINTS ||--o{ COMPLAINT_RESOLUTIONS : "resolution history"
    PROFILES ||--o{ COMPLAINT_RESOLUTIONS : "submits"
    PROFILES o|--o{ COMPLAINT_RESOLUTIONS : "reviews"
    COMPLAINT_RESOLUTIONS o|--o{ COMPLAINT_ATTACHMENTS : "evidence for"
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
        uuid resolution_id FK "nullable"
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
        uuid citizen_id FK
        tinyint rating
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
- A complaint can have multiple assignments, status updates, attachments, resolutions, and escalations; these rows preserve history.
- An assignment references one recipient and one assigning profile. Its handling-unit check requires a barangay for `barangay` assignments or a department for `lgu` assignments.
- Each feedback row references one complaint and one citizen. `feedback.complaint_id` is unique, so a complaint has at most one feedback row.
- Each attachment belongs to a complaint. It may optionally reference a resolution. If a resolution is deleted, the current foreign key sets `resolution_id` to null.
- Escalation origin/destination fields are nullable because their valid combination depends on `escalation_type`; the database check enforces those combinations.
- Supabase Auth is an external identity service, not a table in this ERD. The Laravel `users` table is also not connected to `profiles` in the current migrations; include it only if the application intends to use Laravel-managed accounts.

## Normalization review prompts

Use these questions when checking the ERD against the course or project normalization requirements:

1. **First normal form:** Are all fields atomic? File attachments, status history, assignments, resolutions, and escalations should remain separate rows rather than repeated columns on `complaints`.
2. **Second normal form:** Are non-key attributes dependent on the whole primary key? These tables use UUID surrogate keys; verify there are no duplicated composite facts hiding in text fields.
3. **Third normal form:** Are descriptive facts stored with the entity they describe? Category names belong in `complaint_categories`, barangay names in `barangays`, and department names in `departments`; the complaint stores their foreign keys.
4. **Historical correctness:** Assignment rows store the handling unit as well as the assignee. Keep that snapshot if it is needed to preserve the unit at the time of assignment, even if it can often be inferred from the profile today.
5. **Controlled values:** Decide whether `role`, complaint `status`, `priority`, `resolution_level`, review statuses, and escalation statuses should remain checked strings or become lookup tables. Normalization alone does not require a lookup table for every small fixed list.
6. **Cross-row consistency:** Confirm the API ensures `feedback.citizen_id` is the complaint's citizen, since the current foreign keys only ensure that both referenced records exist.

## Decisions to confirm before finalizing

- Choose canonical complaint status names. Current controller behavior and workflow documentation have used different vocabularies; the latest constraints temporarily allow both.
- Confirm whether status `accepted` is a real complaint state or whether acceptance is recorded as a decision while the complaint becomes `under_review`.
- Confirm that one feedback record per complaint is the requirement.
- Confirm whether every resolution attachment must have a matching `complaint_id` and `resolution_id` pair. Current foreign keys do not ensure both point to the same complaint.
- Confirm whether inactive categories, departments, or barangays should be retained for historical records rather than deleted.

## Source files

This guide is based on the Laravel migrations in `backend/database/migrations`. For column nullability, uniqueness, delete behavior, and check constraints, the migrations are authoritative. The workflow rules and API documentation describe intended behavior and may include features not fully implemented in the current API.
