# BantaySerbisyo API Contract

**Project:** Complaint Management and Citizen Feedback System for Local Government Units  
**Version:** 1.0  
**Status:** Initial Draft  
**Base URL:** `http://localhost:8000/api`

## 1. General API Rules

- Backend framework: Laravel 13.
- Database: Supabase PostgreSQL.
- Authentication: Supabase Auth.
- Protected endpoints require a valid Supabase access token.
- The frontend sends the token using the `Authorization: Bearer <access_token>` header.
- Request and response bodies use JSON unless an endpoint handles file uploads.
- IDs use UUID format.
- Timestamps use ISO 8601 format where returned by the API.
- The backend must validate inputs and enforce role-based and record-level authorization.

### Standard Request Headers

```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <supabase_access_token>
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
| GET | `/profile` | Authenticated | Retrieve or initialize the user's profile |
| PUT | `/profile` | Authenticated | Update permitted profile fields |
| GET | `/barangays` | Public or authenticated, according to deployment policy | Retrieve available barangays |

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

### GET `/profile`

Returns the authenticated user's application profile. Profile creation must not allow the client to assign privileged roles.

### PUT `/profile`

Updates permitted profile fields, such as the user's full name and barangay selection where applicable. The backend must prevent users from changing their own role or assigning themselves to unauthorized departments or barangays.

## 4. Complaint Endpoints — Planned

These endpoints are proposed for implementation. They are not confirmed as existing routes until verified in Laravel.

| Method | Proposed endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/complaints` | Authenticated | List complaints permitted for the current user |
| POST | `/complaints` | Citizen | Create a complaint |
| GET | `/complaints/{id}` | Authorized user | View a permitted complaint |
| PUT | `/complaints/{id}` | Authorized user, subject to workflow rules | Update permitted complaint fields |
| POST | `/complaints/{id}/attachments` | Authorized user | Upload complaint evidence |
| GET | `/complaints/{id}/attachments` | Authorized user | List permitted attachments |

The current route configuration also implements `POST /complaints/{complaintId}/review` for LGU-Staff and `POST /staff/complaints/{complaintId}/route` for initial assignment or reassignment. The review request uses `decision: start_review` to move `submitted` to `under_review`; then `decision: accepted` (with `resolution_level`) or `decision: declined` (with `rejection_reason`) moves an in-review complaint to its decision state. Routing is allowed from `accepted`, `assigned`, or `in_progress`.

The implemented citizen `GET /complaints` endpoint returns the authenticated citizen's 10 newest complaints, pagination metadata, and `statistics` aggregated across all of that citizen's complaints. The statistics include `total`, `pending_review` (`submitted`, `under_review`, and `accepted`), `in_progress` (`assigned` plus `in_progress`), and `resolved` (`resolved` only).

### Complaint Creation

The backend validates the title, description, category, barangay, and priority. The authenticated citizen's identity must come from the verified server-side authentication context, not a client-supplied `citizen_id`.

Allowed priority values:

- `low`
- `medium`
- `high`
- `urgent`

New complaints use the `submitted` status by default. The backend controls status transitions.

### Evidence Upload

- Evidence files are stored in Supabase Storage.
- The backend validates file type, size, ownership, and complaint access.
- Database attachment records store file metadata and the storage path.
- Access to evidence must be restricted to authorized users.

## 5. Complaint Workflow — Planned

Stored status values:

| Stored value | Meaning |
|---|---|
| `submitted` | Complaint has been submitted |
| `under_review` | LGU-Staff is reviewing the complaint |
| `accepted` | Complaint has been accepted for handling |
| `declined` | Complaint has been declined; a reason is required |
| `assigned` | Complaint has been assigned |
| `in_progress` | Responsible handler is working on the complaint |
| `pending_review` | Submitted resolution is awaiting review |
| `resolved` | Resolution has been approved |

Workflow rules:

1. LGU-Staff starts review, moving the complaint from `submitted` to `under_review`.
2. LGU-Staff accepts or declines the complaint from `under_review`; acceptance records whether it belongs to the barangay or LGU, while decline requires a reason.
3. Barangay-level complaints are handled by the Barangay_Head.
4. LGU-level complaints are routed to the appropriate department; Department_Head assigns Department_Personnel.
5. The responsible handler submits a resolution for review.
6. LGU-Staff approves the resolution or returns it for further work.
7. Only authorized server-side actions may change complaint status.

A transfer or reassignment is an event recorded in the assignment history, not a complaint status.

## 6. Resolution Endpoints — Planned

| Method | Proposed endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/complaints/{id}/resolutions` | Authorized assigned handler | Submit a resolution |
| GET | `/complaints/{id}/resolutions` | Authorized user | View resolution history |
| POST | `/complaints/{id}/resolutions/{resolutionId}/review` | LGU-Staff | Approve or return a resolution |

Resolution review values:

- `pending_review`
- `approved`
- `returned`

Each resubmission should create a new resolution record to preserve the review history. A review request must include a valid decision; a return should include a meaningful comment.

## 7. Assignment and Status History — Planned

| Method | Proposed endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/complaints/{id}/assignments` | Authorized user | View assignment history |
| POST | `/complaints/{id}/assignments` | Authorized routing role | Assign or reassign a complaint |
| GET | `/complaints/{id}/updates` | Authorized user | View status history |

The backend verifies that the acting user can assign, view, or update the relevant complaint. Assignment and status history must not be silently overwritten.

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

## 8. Feedback Endpoints — Planned

| Method | Proposed endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/complaints/{id}/feedback` | Complaint-owning citizen, when eligible | Submit feedback |
| GET | `/complaints/{id}/feedback` | Authorized user | View feedback according to permissions |

Feedback ratings must be integers from 1 to 5. The backend must verify complaint ownership and eligibility before accepting feedback.

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

## 10. Implementation Status

The authentication, profile, barangay, complaint intake/review/routing, and escalation routes have implementations in the Laravel route configuration. Resolution workflow and feedback endpoints remain planned; verify every route and response against the current implementation before treating this draft as a complete API contract.

Update this document whenever endpoint paths, request fields, response formats, or authorization rules change.
