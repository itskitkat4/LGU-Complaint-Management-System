    # BantaySerbisyo — Complaint Workflow Rules


    ## 1. Purpose

    This document defines the complaint status lifecycle, role-based permissions, complaint routing rules, and resolution approval process for BantaySerbisyo.

    These rules document the approved complaint lifecycle and guide API and frontend behavior. The remaining items in Section 9 concern operational and role decisions, not the approved complaint statuses.

    ## 2. Complaint Statuses

    The complaint uses the following stored status values:

    | Status | Description |
    |---|---|
    | `submitted` | The citizen has submitted a complaint with the required details. |
    | `under_review` | LGU-Staff is reviewing the complaint and determining the handling level and priority. |
    | `accepted` | LGU-Staff has accepted the complaint for processing. |
    | `declined` | LGU-Staff has declined the complaint; a nonblank reason is required. |
    | `assigned` | The complaint has been routed to a responsible handling unit or handler. |
    | `in_progress` | The responsible handler is working on the complaint, including while a submitted resolution is being reviewed or returned. |
    | `resolved` | LGU-Staff has approved a submitted resolution; this is the final complaint status. |

    `pending_review` is a `complaint_resolutions.review_status` value, not a complaint status. Resolution review does not change the complaint from `in_progress`: approval changes the complaint to `resolved`, while return leaves it `in_progress`.

    There is no separate complaint closure step or `closed` complaint status. No complaint status transition is defined after `resolved`.

    **Important:** `Transferred` is not a complaint status in this workflow. When a complaint moves between handling units, the system should record the transfer or reassignment in the appropriate assignment or workflow history while preserving the complaint's current processing status where appropriate.

    ## 3. Complaint Status Transitions

    The backend must validate every status change. Users must not be allowed to set arbitrary statuses directly.

    | Current Status | Next Status | Authorized Role | Rule |
    |---|---|---|---|
    | `submitted` | `under_review` | LGU-Staff | Review begins and a valid priority is assigned. |
    | `under_review` | `accepted` | LGU-Staff | Complaint is eligible for processing; handling level is recorded. |
    | `under_review` | `declined` | LGU-Staff | A nonblank decline reason is required. |
    | `accepted` | `assigned` | LGU-Staff | A responsible handling unit or handler is identified. |
    | `assigned` | `in_progress` | Active assigned handler | Work on the complaint begins. |
    | `in_progress` | `resolved` | LGU-Staff | A submitted resolution is approved. |

    Submitting a resolution creates a `complaint_resolutions` record with `review_status = pending_review`; it is not a complaint status transition. LGU-Staff changes that resolution review status to `approved` or `returned`. Approval also changes the complaint from `in_progress` to `resolved`; return leaves it `in_progress` so the handler can perform more work and submit a new resolution record.

    `resolved` is terminal. Once LGU-Staff approves a resolution, the complaint does not transition to another complaint status.

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
    - Receive complaint notifications and status updates.
    - Submit feedback once for their own resolved complaint when no feedback has already been submitted.

    Citizens must not access another citizen's private complaint records or change complaint statuses directly.

    ### 4.2 Anonymous Complaints and Identity Visibility

    A citizen may select **Submit anonymously** when creating a complaint. The option defaults to unchecked. `is_anonymous` is stored as a non-null boolean and cannot be changed through the complaint API after submission. The authenticated citizen profile remains the required owner (`citizen_id`); clients cannot choose or spoof that value. Citizens continue to access and track their own anonymous complaints, notifications, and eligible feedback.

    Identity visibility for an anonymous complaint is:

    | Role | Can view complainant identity? |
    |---|---|
    | System Administrator (Admin) | Yes, through the authorized administrative complaint view. |
    | LGU-Staff | No. |
    | Barangay_Head | No. |
    | Department_Head | No. |
    | Department_Personnel | No. |
    | Citizen who owns the complaint | Yes, for their own complaint and account. |

    For non-Admin personnel, complaint API responses omit the anonymous complainant profile and owner identifier, including when complaint data is nested in review, assignment, resolution, or monitoring responses. Feedback monitoring omits the anonymous citizen ID and display name. Complaint attachment responses use a generic filename and omit the uploader profile ID. Admin complaint listing and detail APIs are restricted to active System Administrators and retain the identity fields.

    Anonymous complainants receive the same complaint submission confirmation, status tracking, notifications, resolution updates, and feedback eligibility as other citizens. Notification records remain scoped to the recipient profile, so complaint status and resolution notifications go to the owning citizen without exposing identity to personnel. Feedback remains private to its submitting citizen; the personnel feedback-monitoring projection suppresses the anonymous citizen ID and name. Current staff reports are aggregate summaries and do not return complainant identifiers. Anonymity is not a status and does not alter routing, resolution review, escalation, or feedback rules.

    ### 4.3 Barangay_Head

    Each barangay will have one designated `Barangay_Head` account. There is no separate Barangay Personnel role.

    The Barangay Head may:

    - View complaints routed to their assigned barangay.
    - Handle barangay-level complaints within their authority.
    - Update progress on complaints they are authorized to handle.
    - Submit resolution details and supporting evidence for review.
    - Escalate complaints that exceed barangay authority to the appropriate LGU department.
    - Provide an escalation reason and any relevant complaint details.

    The Barangay Head must not access complaints belonging to another barangay unless explicitly authorized by the system's approved access rules.

    ### 4.4 LGU-Staff

    LGU-Staff is responsible for initial complaint review, routing, Barangay Head escalation review, and resolution approval.

    LGU-Staff may:

    - Review complaint details and submitted evidence.
    - Assign complaint priority during review, using the supported values `low`, `medium`, `high`, or `urgent`. Citizens cannot set priority.
    - Accept or decline complaints, recording a reason for declines.
    - Determine whether a complaint should remain at barangay level or be routed to LGU-level handling.
    - Route complaints according to approved procedures and authorization.
    - Review Barangay Head escalation requests, accept them or redirect them to an appropriate department, and record the decision and reason.
    - Review submitted resolutions and approve or return them for additional work.
    - Record review decisions, status changes, and relevant comments.

    LGU-Staff must not approve a resolution without reviewing the submitted resolution details and required supporting evidence.

    ### 4.5 Department_Head

    The Department Head manages complaints routed to their department.

    The Department Head may:

    - Review complaints assigned to their department.
    - Assign LGU-level complaints to appropriate Department Personnel.
    - Reassign personnel when necessary and authorized.
    - Monitor departmental complaint progress.
    - Review incomplete assignments and coordinate required follow-up.
    - Escalate matters beyond the department's authority to the designated higher authority, coordinating supporting documents manually outside the system.

    Every assignment or reassignment must identify the responsible personnel member and the user who made the assignment.

    ### 4.6 Department_Personnel

    Department Personnel handle LGU-level complaints assigned by the Department Head.

    They may:

    - View complaints assigned to them.
    - Update progress on assigned complaints.
    - Perform the required corrective or service action.
    - Submit resolution details and supporting evidence.
    - Respond to a resolution returned by LGU-Staff for additional work.

    Department Personnel must not mark a complaint as `Resolved` directly. The final resolution approval is performed by LGU-Staff.

    ### 4.7 System Administrator

    The System Administrator manages system configuration and authorized account administration.

    Responsibilities may include:

    - Creating and managing non-citizen staff accounts.
    - Assigning approved roles.
    - Managing barangays, departments, and complaint categories.
    - Maintaining authorized system configuration.

    Administrative access must follow least-privilege principles. Active System Administrators can use the administrative complaint listing and detail endpoints/screen to view complainant identity, including for anonymous complaints. This access is explicit and role-restricted.

    ## 5. Complaint Routing Rules

    ### 5.1 Initial Review

    LGU-Staff reviews each submitted complaint and determines the appropriate handling level based on the complaint details, location, category, jurisdiction, and approved local procedures.

    Operational guidance: LGU-Staff should make routing decisions using their review of the complaint and applicable procedures, rather than relying solely on an automated recommendation. The application does not technically enforce this guidance.

    ### 5.2 Barangay-Level Complaints

    A complaint may remain at barangay level when the issue falls within the Barangay Head's authority and can reasonably be handled by the barangay.

    The workflow is:

    1. LGU-Staff reviews and accepts the complaint.
    2. The complaint is routed to the appropriate barangay.
    3. The Barangay Head handles the complaint.
    4. The Barangay Head records progress and submits the proposed resolution with supporting evidence.
    5. The complaint remains `in_progress`; its resolution record enters `pending_review`.
    6. LGU-Staff reviews the proposed resolution.
    7. LGU-Staff either approves the resolution, changing the resolution review status to `approved` and the complaint status to `resolved`, or returns the resolution, setting its review status to `returned` while the complaint remains `in_progress`.

    ### 5.3 LGU-Level Complaints

    A complaint must be routed to LGU-level handling when it requires municipal authority, a specialized department, or resources outside the Barangay Head's authority.

    The workflow is:

    1. LGU-Staff reviews and accepts the complaint.
    2. The complaint is routed to the appropriate department.
    3. The Department Head assigns the complaint to suitable Department Personnel.
    4. Department Personnel handles the complaint and records progress.
    5. Department Personnel submits the proposed resolution with supporting evidence.
    6. The complaint remains `in_progress`; its resolution record enters `pending_review`.
    7. LGU-Staff reviews the proposed resolution.
    8. LGU-Staff either approves the resolution, changing its review status to `approved` and the complaint status to `resolved`, or returns the resolution, setting its review status to `returned` while the complaint remains `in_progress`.

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

    ### 5.5 Escalation Workflow

    Escalation is used when a complaint requires authority or resources beyond the current handling unit. An escalation is recorded as a workflow event; it does not by itself change the complaint's processing status.

    #### Barangay Head to LGU Department

    1. The Barangay Head determines that the complaint cannot be handled within the barangay's authority or resources.
    2. The Barangay Head submits an escalation request to the appropriate LGU department, including the reason and relevant complaint details.
    3. The system records the requesting Barangay Head, originating barangay, destination department, reason, and date and time.
    4. The request appears in the LGU-Staff escalation inbox for review. No separate email or push notification is currently sent.
    5. LGU-Staff reviews the request. They accept the requested department or redirect it to another appropriate department, recording a review comment.
    6. On either decision, the system ends the barangay assignment, assigns the complaint to the Department Head of the selected department, records the routing decision in complaint history, and keeps the complaint at `Assigned` status for LGU-level handling.
    7. The Department Head sees the assigned complaint in their department complaint queue and assigns it to suitable Department Personnel, who handle it under the LGU-level complaint workflow in Section 5.3.
    8. The Barangay Head can see the recorded escalation decision and subsequent complaint progress according to their access permissions.

    #### Department Head to Higher Authority

    1. The Department Head determines that the complaint requires authority, coordination, or resources beyond the department's remit.
    2. The Department Head records an escalation to the designated higher authority, including the reason, destination, and date and time.
    3. The Department Head sends supporting documents and evidence to that authority manually, outside the system. The higher authority does not need a system account for this workflow.
    4. The system records the escalation, but does not send an in-system notification to the higher authority.
    5. When a response is received, the Department Head records the outcome or decision in the complaint history and coordinates any next action.

    The specific higher authority (for example, the Municipal Administrator or Mayor's Office) must be designated by the LGU. Escalating a complaint does not automatically resolve it or change its processing status.

    ## 6. Resolution Approval Workflow

    The application requires `resolution_description` and validates its length, but does not semantically verify that it explains the action taken or outcome. Operational guidance: handlers should use the description to explain both.

    Every resolution submission must include a completion date (`completed_at`), a before photo, and at least one evidence file. The before photo must be an image in JPG, JPEG, PNG, or WEBP format and no larger than 10,240 KB. The `evidence` array must contain one to five files; each must be JPG, JPEG, PNG, PDF, or WEBP and no larger than 10,240 KB. The completion date must be accepted by Laravel's `date` validation and be no later than today. The resolution description is required and must contain 10 to 10,000 characters. The before photo is stored as evidence type `before`; evidence array files are stored as `supporting`.

    The approval process is:

    1. The Barangay Head or Department Personnel completes the required action.
    2. The responsible handler submits the resolution details and supporting evidence.
    3. The complaint remains `in_progress`; the new resolution record receives `review_status = pending_review`.
    4. LGU-Staff reviews the submitted resolution.
    5. If approved, LGU-Staff sets the resolution review status to `approved` and changes the complaint status to `resolved`.
    6. If returned, LGU-Staff sets the resolution review status to `returned` and provides a comment; the complaint remains `in_progress`.
    7. The responsible handler performs any additional required work and submits a new resolution record. Previous submissions and review decisions remain in the resolution history.

    Only an active Barangay_Head or Department_Personnel with the complaint's matching active assignment may submit. Submission is restricted to `in_progress` complaints. A new submission is rejected while a previous resolution remains `pending_review`; after a return, the handler may submit a new resolution record. LGU-Staff alone reviews the pending resolution. A returned review requires a nonblank comment up to 2,000 characters. Approval marks the resolution `approved`, changes the complaint to `resolved`, and ends its active assignment. Return marks the resolution `returned` and leaves the complaint `in_progress`; the comment and prior submission remain in the resolution history.

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
    - `citizen_id` remains required and is derived only from the authenticated citizen profile on submission.
    - Feedback eligibility and ownership are checked by the API. The source migration dated 2026-11-23 adds a composite database constraint tying `feedback.citizen_id` to the owner of its complaint; its execution on deployed Supabase is unverified.
    - Anonymous status is immutable after submission. Non-Admin personnel responses must redact identity from complaint, resolution, feedback-monitoring, and attachment metadata paths; citizens retain owner access and Admin retains authorized identity access.
    - Relevant actions and status changes must be recorded for auditing.

    ## 8. Implementation Notes

    The current source migrations and backend implement the complaint and resolution workflows described above. Resolution review state is stored on the resolution record; the complaint status constraint does not include `pending_review`. Anonymous complaint submission and API identity redaction are implemented. The backend supports:

    - The complaint status values and resolution review-status values as separate state sets.
    - Resolution submissions awaiting review.
    - Approval and return decisions, including reasons.
    - Assignment and reassignment history.
    - Status-change history, timestamps, and responsible users.
    - Role-based and record-level access checks.
    - Optional anonymous submission with required owner linkage, unchecked default, and no post-submission update route.
    - Admin-only complaint list/detail identity access and non-Admin identity redaction, including feedback monitoring and attachment filename/uploader metadata.

    Complaint evidence filenames are stored using generated generic names instead of the client-provided original filename. Image bytes are stored as uploaded; embedded image metadata such as EXIF is not currently stripped. The backend stores MIME type and file size, which are available to complaint owners and Admin; non-Admin personnel receive only a generic filename and no uploader ID. No separate public tracking number is added; citizens track by their complaint records and existing IDs.

    The Admin complaint interface currently supports paginated listing with identity fields. The source does not provide a separate Admin action to edit, route, or resolve complaints; those workflows remain assigned to their existing authorized roles.

    Any future schema or workflow changes must be reviewed against the approved requirements and implemented through coordinated, reviewed changes; this document does not authorize or perform schema changes.

    ## 9. Pending Team and Adviser Review

    The following operational and role details require formal review:

    - [ ] Confirm that `Transferred` is an assignment or workflow event rather than a complaint status.
    - [ ] Confirm that the Barangay Head handles barangay-level complaints directly, with no separate Barangay Personnel role.
    - [ ] Confirm that the Department Head assigns LGU-level complaints to Department Personnel.
    - [ ] Formally confirm with the team/adviser that LGU-Staff reviews Barangay Head escalation requests; the current implementation routes requests to the LGU-Staff escalation inbox and then places approved/redirected complaints in the receiving Department Head's complaint queue (no separate notification delivery is implemented).
    - [ ] Designate the higher authority for Department Head escalations and confirm that supporting documents are handled manually outside the system.
    - [ ] Confirm that LGU-Staff approves resolutions for both barangay-level and LGU-level complaints.
    - [ ] Review the operational status transition and required validation rules.
    - [ ] Compare the approved workflow against the database schema and API contract.
