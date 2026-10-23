# BantaySerbisyo — Complaint Workflow Rules


## 1. Purpose

This document defines the complaint status lifecycle, role-based permissions, complaint routing rules, and resolution approval process for BantaySerbisyo.

These rules will guide backend validation, API development, database constraints, and frontend workflow behavior.

The rules remain subject to team and adviser review before final implementation.

## 2. Complaint Statuses

The system will use the following proposed complaint statuses:

| Status | Description |
|---|---|
| `Submitted` | The citizen has submitted a complaint with the required details. |
| `Under Review` | LGU-Staff is reviewing the complaint and determining the appropriate handling level. |
| `Accepted` | LGU-Staff has accepted the complaint for processing. |
| `Declined` | LGU-Staff has declined the complaint. A reason must be recorded. |
| `Assigned` | The complaint has been routed to a responsible handler or department personnel member. |
| `In Progress` | The responsible handler is working on the complaint. |
| `Pending Review` | A resolution has been submitted and is awaiting LGU-Staff review and approval. |
| `Resolved` | LGU-Staff has approved the submitted resolution. |

**Important:** `Transferred` is not a complaint status in this workflow. When a complaint moves between handling units, the system should record the transfer or reassignment in the appropriate assignment or workflow history while preserving the complaint's current processing status where appropriate.

## 3. Complaint Status Transitions

The backend must validate every status change. Users must not be allowed to set arbitrary statuses directly.

| Current Status | Next Status | Authorized Role | Rule |
|---|---|---|---|
| `Submitted` | `Under Review` | LGU-Staff | Review begins. |
| `Under Review` | `Accepted` | LGU-Staff | Complaint is eligible for processing. |
| `Under Review` | `Declined` | LGU-Staff | A decline reason is required. |
| `Accepted` | `Assigned` | Authorized routing role | A responsible handling unit or handler must be identified. |
| `Assigned` | `In Progress` | Assigned handler | Work on the complaint begins. |
| `In Progress` | `Pending Review` | Authorized complaint handler | A resolution is submitted for review. |
| `Pending Review` | `Resolved` | LGU-Staff | The submitted resolution is approved. |
| `Pending Review` | `In Progress` | LGU-Staff | The resolution is returned for additional work. |

Every status change must record the previous status, new status, responsible user, timestamp, and relevant comment or reason when applicable.

The system must reject unauthorized or invalid transitions.

## 4. User Roles and Permissions

### 4.1 Citizen

Citizens may:

- Sign in using Google authentication.
- Complete and update their own citizen profile.
- Submit complaints and required supporting evidence.
- View and track their own complaints.
- View complaint status updates and approved resolution details.
- Submit feedback when the applicable workflow permits it.

Citizens must not access another citizen's private complaint records or change complaint statuses directly.

### 4.2 Barangay_Head

Each barangay will have one designated `Barangay_Head` account. There is no separate Barangay Personnel role.

The Barangay Head may:

- View complaints routed to their assigned barangay.
- Handle barangay-level complaints within their authority.
- Update progress on complaints they are authorized to handle.
- Submit resolution details and supporting evidence for review.
- Escalate complaints that require LGU-level handling.

The Barangay Head must not access complaints belonging to another barangay unless explicitly authorized by the system's approved access rules.

### 4.3 LGU-Staff

LGU-Staff is responsible for initial complaint review and resolution approval.

LGU-Staff may:

- Review complaint details and submitted evidence.
- Accept or decline complaints, recording a reason for declines.
- Determine whether a complaint should remain at barangay level or be routed to LGU-level handling.
- Route complaints according to approved procedures and authorization.
- Review submitted resolutions and approve or return them for additional work.
- Record review decisions, status changes, and relevant comments.

LGU-Staff must not approve a resolution without reviewing the submitted resolution details and required supporting evidence.

### 4.4 Department_Head

The Department Head manages complaints routed to their department.

The Department Head may:

- Review complaints assigned to their department.
- Assign LGU-level complaints to appropriate Department Personnel.
- Reassign personnel when necessary and authorized.
- Monitor departmental complaint progress.
- Review incomplete assignments and coordinate required follow-up.

Every assignment or reassignment must identify the responsible personnel member and the user who made the assignment.

### 4.5 Department_Personnel

Department Personnel handle LGU-level complaints assigned by the Department Head.

They may:

- View complaints assigned to them.
- Update progress on assigned complaints.
- Perform the required corrective or service action.
- Submit resolution details and supporting evidence.
- Respond to a resolution returned by LGU-Staff for additional work.

Department Personnel must not mark a complaint as `Resolved` directly. The final resolution approval is performed by LGU-Staff.

### 4.6 System Administrator

The System Administrator manages system configuration and authorized account administration.

Responsibilities may include:

- Creating and managing non-citizen staff accounts.
- Assigning approved roles.
- Managing barangays, departments, and complaint categories.
- Maintaining authorized system configuration.

Administrative access must follow least-privilege principles. The System Administrator must not automatically receive unrestricted access to all sensitive complaint information.

## 5. Complaint Routing Rules

### 5.1 Initial Review

LGU-Staff reviews each submitted complaint and determines the appropriate handling level based on the complaint details, location, category, jurisdiction, and approved local procedures.

A complaint must not be routed solely based on an automated recommendation.

### 5.2 Barangay-Level Complaints

A complaint may remain at barangay level when the issue falls within the Barangay Head's authority and can reasonably be handled by the barangay.

The workflow is:

1. LGU-Staff reviews and accepts the complaint.
2. The complaint is routed to the appropriate barangay.
3. The Barangay Head handles the complaint.
4. The Barangay Head records progress and submits the proposed resolution with supporting evidence.
5. The complaint enters `Pending Review`.
6. LGU-Staff reviews the proposed resolution.
7. LGU-Staff either approves the resolution, changing the status to `Resolved`, or returns it to `In Progress` for additional work.

### 5.3 LGU-Level Complaints

A complaint must be routed to LGU-level handling when it requires municipal authority, a specialized department, or resources outside the Barangay Head's authority.

The workflow is:

1. LGU-Staff reviews and accepts the complaint.
2. The complaint is routed to the appropriate department.
3. The Department Head assigns the complaint to suitable Department Personnel.
4. Department Personnel handles the complaint and records progress.
5. Department Personnel submits the proposed resolution with supporting evidence.
6. The complaint enters `Pending Review`.
7. LGU-Staff reviews the proposed resolution.
8. LGU-Staff approves the resolution, changing the status to `Resolved`, or returns it to `In Progress` for additional work.

### 5.4 Transfer and Reassignment Records

When a complaint needs to move to another handling unit or responsible person, the system must preserve the relevant history.

The record should include, where applicable:

- Complaint identifier.
- Previous and receiving handling unit or assignee.
- User who authorized or performed the transfer or reassignment.
- Date and time.
- Reason for the change.
- Relevant notes.

A transfer or reassignment does not automatically mean that the complaint is resolved or that its processing work has restarted.

## 6. Resolution Approval Workflow

The responsible handler must provide a resolution description explaining what action was taken and the outcome.

Supporting evidence must be attached when required by the complaint type or applicable procedure. A photograph alone is not sufficient to describe the resolution.

The approval process is:

1. The Barangay Head or Department Personnel completes the required action.
2. The responsible handler submits the resolution details and supporting evidence.
3. The system changes the complaint status to `Pending Review`.
4. LGU-Staff reviews the submitted resolution.
5. If approved, LGU-Staff changes the status to `Resolved`.
6. If returned, LGU-Staff provides a reason or comments, and the status returns to `In Progress`.
7. The responsible handler performs any additional required work and submits the resolution again.

The system must retain the resolution submission and review history for accountability.

## 7. Access Control Rules

- All authorization decisions must be enforced by the backend, not only by frontend navigation or UI controls.
- Citizens may access only their own profile and complaint information.
- Barangay Heads may access complaints within their authorized barangay scope.
- Department Heads may access complaints within their authorized departmental scope.
- Department Personnel may access complaints assigned to them.
- LGU-Staff may review and manage complaints within its assigned authority.
- System Administrator permissions must follow approved administrative access rules.
- Every protected API endpoint must verify the user's identity, role, and applicable record-level permissions.
- Evidence files and complaint details must not be exposed to unauthorized users.
- Relevant actions and status changes must be recorded for auditing.

## 8. Implementation Notes

The current database includes `complaints`, `complaint_assignments`, `complaint_attachments`, and `complaint_updates`.

Before implementation, the backend design must be checked to ensure that it can support:

- The approved status values and transitions.
- Resolution submissions awaiting review.
- Approval and return decisions, including reasons.
- Assignment and reassignment history.
- Status-change history, timestamps, and responsible users.
- Role-based and record-level access checks.

The existing database schema must not be changed until the team has reviewed the workflow rules and identified the required schema changes.

## 9. Pending Team and Adviser Review

The following items require formal review before the rules are considered final:

- [ ] Confirm the proposed eight complaint statuses, including `Pending Review`.
- [ ] Confirm that `Transferred` is an assignment or workflow event rather than a complaint status.
- [ ] Confirm that the Barangay Head handles barangay-level complaints directly, with no separate Barangay Personnel role.
- [ ] Confirm that the Department Head assigns LGU-level complaints to Department Personnel.
- [ ] Confirm that LGU-Staff approves resolutions for both barangay-level and LGU-level complaints.
- [ ] Review the status transitions and required validation rules.
- [ ] Compare the approved workflow against the database schema and API contract.

---

The Barangay Head or Department Personnel submits a proposed resolution.

The system records the submission and its supporting evidence.

LGU-Staff reviews it and either approves it or returns it with comments.

If returned, the complaint goes back to In Progress.

The handler can submit a revised resolution, while the previous submission and review decision remain available for audit.