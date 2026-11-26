# BantaySerbisyo manual role-play and functional test checklist

Use this checklist to verify the running system as a human user. It complements automated tests; it does not replace security review or production monitoring.

**System/build:** ____________________  
**Environment (local/staging):** ____________________  
**Tester/date:** ____________________  
**Browser/device:** ____________________  
**API/database version:** ____________________

## How to use this checklist

- Run this in a local or staging environment with test accounts and synthetic complaint data. Never use real citizen personal information or production records.
- Create one account for each role and record the test account label (do not write passwords or tokens here).
- Follow the end-to-end scenario in order. Mark **Pass**, **Fail**, **Blocked**, or **N/A**. A blocked item needs a reason and owner; do not mark it passed.
- For each failure record the case ID, timestamp, role, complaint reference, steps, expected/actual result, screenshot or sanitized request ID, and browser/API log evidence. Remove personal data, bearer tokens, signed URLs, and secrets from evidence.
- Use one complaint per scenario unless a case explicitly asks for another. Record the complaint UUID/reference in a private test log.
- Verify the UI and the resulting state/history where permitted. Do not directly edit the database during a user-flow test.

## Test setup

### Test accounts and records

| Role | Account label | Active? | Test scope / organization |
|---|---|---|---|
| Citizen | ____________________ | ☐ | Test barangay: ____________________ |
| LGU-Staff | ____________________ | ☐ | System-wide review scope |
| Barangay Head | ____________________ | ☐ | Same test barangay |
| Department Head | ____________________ | ☐ | Test department: ____________________ |
| Department Personnel | ____________________ | ☐ | Same test department |
| System Administrator | ____________________ | ☐ | Administration only |
| Unrelated citizen (negative authorization checks) | ____________________ | ☐ | Different owner/barangay |
| Unrelated department staff (negative checks) | ____________________ | ☐ | Different department |

- [ ] Confirm the backend, frontend, Supabase Auth, database, and private storage are pointed at the intended test environment.
- [ ] Confirm test accounts have the intended exact role and are active.
- [ ] Confirm test barangays, departments, and complaint categories exist.
- [ ] Confirm one Department Head and one Department Personnel are linked to the test department, and a Barangay Head is linked to the test barangay.
- [ ] Confirm file upload and signed URL behavior can use the test storage bucket.
- [ ] Confirm the AI provider is configured if testing the assistant; otherwise mark AI cases blocked/N/A and continue the normal complaint flow.
- [ ] Confirm no production email, SMS, webhook, or real citizen notification will be triggered by this test.
- [ ] Agree who will reset test data and how. Never reset or migrate a shared database without an approved backup and explicit test environment confirmation.

## A. Public pages and authentication

### Visitor

- [ ] **A01 Landing page:** open `/`; page loads, content and links are usable, no console-breaking error.
- [ ] **A02 Public lookups:** open complaint creation or lookup controls; barangay and category options load and are readable.
- [ ] **A03 Responsive layout:** check narrow/mobile and desktop widths; navigation and primary actions remain usable without clipped content.

### Citizen / invited staff sign-in

- [ ] **A04 Valid password sign-in:** sign in with a test account; the correct role home page appears.
- [ ] **A05 Invalid password:** invalid credentials show a useful error and do not expose account/token details.
- [ ] **A06 Google sign-in (if enabled):** complete OAuth in the configured test project; callback returns to the application and correct profile loads.
- [ ] **A07 Expired or signed-out session:** refresh a protected page; user is redirected or shown an accurate sign-in state without stale protected content.
- [ ] **A08 Profile fetch unavailable:** simulate API outage if feasible; protected content stays hidden and the page offers a useful retry/error state.
- [ ] **A09 Role redirect:** each role lands on its own dashboard; an unsupported role does not gain access.
- [ ] **A10 Sign out:** sign out; protected page refresh does not restore access; sign-in works again.
- [ ] **A11 Password setup:** use an invited staff test account, follow setup link, set password, sign in, and confirm role access.
- [ ] **A12 Invitation resend / duplicate staff:** administrator exercises valid resend and duplicate/invalid account cases; responses are understandable and do not create unintended active accounts.

## B. Citizen role: profile, complaint, tracking, feedback

Sign in as the citizen. Use synthetic text and a harmless test attachment.

### Profile and onboarding

- [ ] **B01 First-time profile:** finish onboarding and select the test barangay; profile persists after refresh/re-login.
- [ ] **B02 Edit profile:** update permitted fields; refreshed profile shows saved values.
- [ ] **B03 Invalid profile input:** required/invalid fields show validation and are not saved.
- [ ] **B04 Ownership:** a citizen cannot edit another user's profile by changing a URL or request ID.

### Complaint creation

- [ ] **B05 Required fields:** attempt submission with required fields missing; clear validation appears and no complaint is created.
- [ ] **B06 Valid complaint:** submit a normal complaint with category, barangay, location, and description; success message/reference appears.
- [ ] **B07 Initial state:** complaint appears in citizen list/detail with `submitted` status and correct details.
- [ ] **B08 Initial priority:** citizen cannot choose or spoof a priority; server applies the documented default and staff later sets priority.
- [ ] **B09 Evidence upload:** attach an allowed file; submission succeeds and authorized complaint detail can open it.
- [ ] **B10 Invalid/oversized evidence:** attempt disallowed type/size; user receives useful rejection and no broken attachment is recorded.
- [ ] **B11 Anonymous complaint:** submit a second complaint as anonymous; citizen can track it, while staff views/API responses do not expose identity where anonymous redaction is required.
- [ ] **B12 Duplicate submit:** double-click or retry submission; confirm the UI prevents unintended duplicate complaints or document current behavior.
- [ ] **B13 Assistant draft (if configured):** send a short truthful test scenario; assistant returns a draft with relevant fields and does not submit automatically.
- [ ] **B14 Assistant limits/outage:** invalid/oversized chat input and provider outage show safe errors; normal complaint form remains usable.
- [ ] **B15 Citizen list/detail:** list and detail agree on complaint ID, status, category, location, creation date, priority visibility, and history.
- [ ] **B16 Citizen ownership isolation:** log in as unrelated citizen; first citizen's complaint, evidence, and history are not visible by direct URL/API access.
- [ ] **B17 Complaint status history:** after staff/handler actions later, refresh details and check each transition appears once and in sensible order.

### Notifications and feedback

- [ ] **B18 Notification received:** complete a later workflow action that should notify citizen; notification appears with accurate complaint context.
- [ ] **B19 Notification pagination:** if more than one page exists, next/previous controls show the right records and page state.
- [ ] **B20 Mark one read:** mark a notification read; unread count and row state update and remain updated after refresh.
- [ ] **B21 Mark all read:** mark all read; unread count becomes zero.
- [ ] **B22 Feedback eligibility:** before resolution, complaint is not eligible for feedback.
- [ ] **B23 Feedback after resolution:** after staff approves resolution, submit rating/comment; saved feedback appears once.
- [ ] **B24 Feedback duplicates/ownership:** duplicate feedback is rejected; unrelated citizen cannot submit feedback for this complaint or learn private complaint details.
- [ ] **B25 Feedback validation:** invalid rating/comment is rejected with clear field feedback.

## C. LGU-Staff role: review, priority, routing, escalation, resolutions, reports

Sign in as LGU-Staff.

### Review and assignment

- [ ] **C01 Dashboard:** summary counts match the queues/history for this test dataset; empty values render as zero, not errors.
- [ ] **C02 New complaint queue:** B06 complaint appears in review queue with correct citizen/anonymous presentation and details.
- [ ] **C03 Review detail:** open complaint; details, evidence, and status history load.
- [ ] **C04 Set priority and accept:** choose a valid priority and accept; UI and stored complaint show accepted state and priority.
- [ ] **C05 Decline:** test a separate complaint and decline with required reason (if required); status/history and citizen-facing explanation are accurate.
- [ ] **C06 Invalid review transition:** attempt review on a complaint in an incompatible state; system rejects it without changing state.
- [ ] **C07 Invalid priority:** submit an unsupported priority through UI/API; validation rejects it.
- [ ] **C08 Route to barangay:** route an accepted complaint to the test barangay; active assignment is visible to that Barangay Head.
- [ ] **C09 Route to department:** route another accepted complaint to test department/handling unit; intended Head/personnel sees it.
- [ ] **C10 Eligible assignees:** list contains only eligible active assignees for the selected handling unit.
- [ ] **C11 Assignment transfer:** route/reassign an assigned complaint; old assignee loses work access and new assignee gains it.
- [ ] **C12 Duplicate active assignment:** attempt conflicting assignment; only one active assignment remains and the user receives a useful response.

### Escalations and resolution review

- [ ] **C13 Escalation inbox:** a valid escalation request appears once with correct complaint and requester context.
- [ ] **C14 Escalation decision:** approve/reject escalation; outcome is visible to the relevant handler and history is recorded.
- [ ] **C15 Resolution queue:** handler-submitted resolution appears with resolution text and evidence.
- [ ] **C16 Approve resolution:** approve; resolution is approved and complaint transitions to `resolved` exactly once.
- [ ] **C17 Return resolution:** use another test complaint, return resolution with a reason; complaint stays `in_progress` and handler can see reason and resubmit.
- [ ] **C18 Re-review resubmission:** revised resolution can be reviewed; old resolution/history is not silently lost.
- [ ] **C19 Invalid resolution transition:** a user cannot approve/return a nonexistent or already-final resolution.

### Reports and monitoring

- [ ] **C20 Report summary:** date range/filter totals match known synthetic complaints.
- [ ] **C21 Generate report:** create report for a defined period; stored summary and displayed range are correct.
- [ ] **C22 PDF upload/download:** upload valid PDF and download through signed URL; unauthorized roles cannot obtain the link.
- [ ] **C23 Invalid report file:** invalid/oversized file is rejected without replacing a valid stored report.
- [ ] **C24 Report authorization:** non-staff account cannot create, upload, or retrieve report PDFs.
- [ ] **C25 Notifications:** staff notification page/bell shows intended items and read/unread behavior works.

## D. Barangay Head role

Sign in as the test Barangay Head.

- [ ] **D01 Dashboard counts:** counts match assigned complaints for this barangay and the agreed status definitions.
- [ ] **D02 Assigned queue:** C08 complaint appears; unrelated barangay complaint does not.
- [ ] **D03 Complaint history:** historical records and filters behave; active queue and history do not duplicate or lose records.
- [ ] **D04 Complaint detail/evidence:** authorized Head can view assigned complaint and obtain valid evidence links.
- [ ] **D05 Start work:** start an assigned complaint; status changes from `assigned` to `in_progress`, history/notification is recorded.
- [ ] **D06 Start work twice:** repeat start action; no duplicate or invalid transition occurs.
- [ ] **D07 Resolution submission:** submit resolution text and evidence; UI confirms submission and complaint remains in progress during review.
- [ ] **D08 Escalation request:** request escalation where permitted; pending request appears in staff inbox and duplicate/invalid request is handled clearly.
- [ ] **D09 Escalation outcome:** after decision, Head sees the outcome and can continue the allowed workflow.
- [ ] **D10 Cross-barangay denial:** attempt another barangay's complaint by ID; detail, evidence, start, resolution, and escalation are denied.
- [ ] **D11 Feedback monitoring:** totals and comments are limited to the Head's permitted barangay scope.

## E. Department Head role

Sign in as the test Department Head.

- [ ] **E01 Dashboard:** department-specific counts match assignments and do not include another department's work.
- [ ] **E02 Queue and monitoring:** C09 complaint appears in department queue/monitoring with current handler, status counts, and escalation details.
- [ ] **E03 Assign personnel:** assign active personnel in the same department; assignment becomes active and personnel can see the case.
- [ ] **E04 Ineligible personnel:** attempt inactive or other-department personnel; server rejects assignment.
- [ ] **E05 Reassignment:** transfer work; former personnel cannot start work after reassignment and new assignee can.
- [ ] **E06 Assignment conflict:** simultaneous/duplicate assignment attempt leaves one active assignment and a useful conflict response.
- [ ] **E07 Evidence access:** Head can view evidence on an active department assignment, including an assignment addressed directly to the Head.
- [ ] **E08 Escalation request/outcome:** request escalation if allowed and record outcome when routed to Head; status/history are correct.
- [ ] **E09 Department isolation:** attempt another department's complaint, personnel, monitoring, or evidence; access is denied.
- [ ] **E10 Feedback monitoring:** only permitted department feedback is shown; empty state is clear.

## F. Department Personnel role

Sign in as the assigned test Department Personnel.

- [ ] **F01 Dashboard/assignments:** C09 appears only after assignment to this user; unrelated assignments do not.
- [ ] **F02 Complaint detail:** correct description, handling unit, history, and evidence are visible.
- [ ] **F03 Start work:** start once; state becomes `in_progress` and history is recorded.
- [ ] **F04 Start work after reassignment:** after E05 transfers another test complaint, former assignee cannot start it; no status/history mutation occurs.
- [ ] **F05 Resolution and evidence:** submit resolution; upload metadata and storage evidence correspond to the correct complaint/resolution.
- [ ] **F06 Escalation visibility:** see escalation outcome or assignment update relevant to the complaint.
- [ ] **F07 Unauthorized complaint:** direct URL/API access to unassigned/other department complaint is denied, including evidence signed URL.
- [ ] **F08 Role restrictions:** personnel cannot perform staff review, department assignment, admin management, or resolution approval.

## G. System Administrator role

Sign in as System Administrator. Use only test records.

- [ ] **G01 Admin dashboard:** summary totals and recent complaints render and agree with the synthetic dataset definition.
- [ ] **G02 User directory:** accounts, roles, active states, and filters are accurate; secrets are never shown.
- [ ] **G03 Invite staff:** create valid test staff invitation; user receives expected setup flow and correct role/profile.
- [ ] **G04 Duplicate role assignment:** try creating second active Department Head/Barangay Head for same scope; useful conflict response appears and constraint remains enforced.
- [ ] **G05 Deactivate account:** deactivate test staff; their next protected API/page request is denied and active assignment handling is understood.
- [ ] **G06 Department management:** create/update a test department; validation and links to personnel behave correctly.
- [ ] **G07 Department deletion:** attempt deletion with linked records; system prevents unsafe data loss or explains behavior.
- [ ] **G08 Barangay management:** create/update test barangay; citizen lookup and account assignment use the updated record.
- [ ] **G09 Complaint inspection:** admin can inspect complaint as designed; anonymous identity remains protected according to policy.
- [ ] **G10 API authorization:** administrator cannot use non-admin endpoints to bypass workflow rules; all writes still validate state/ownership.
- [ ] **G11 Non-admin denial:** repeat admin pages/API calls as each other role; access is denied without leaking records.

## H. Cross-role end-to-end scenario (required)

Use the same test complaint and record each handoff. Expected path: citizen → LGU-Staff → handler → LGU-Staff review → citizen feedback.

- [ ] **H01 Citizen submits** a standard complaint with evidence; note reference and confirm `submitted`.
- [ ] **H02 Staff reviews** it, sets priority, and accepts; confirm `accepted` and history.
- [ ] **H03 Staff routes** it to the test barangay or department; confirm `assigned` and only intended handler sees it.
- [ ] **H04 Handler starts** work; confirm `in_progress`, history, and citizen notification.
- [ ] **H05 Handler submits** resolution/evidence; confirm resolution pending review and complaint still `in_progress`.
- [ ] **H06 Staff returns** resolution once with a reason; handler sees reason and resubmits revised work.
- [ ] **H07 Staff approves** revised resolution; confirm complaint `resolved`, resolution approved, and citizen notified.
- [ ] **H08 Citizen gives feedback** once; confirm it is linked to their own complaint and shown only in allowed monitoring scope.
- [ ] **H09 Audit trail:** verify actor, timestamps, state order, assignment changes, resolution attempts, notifications, and feedback are coherent.
- [ ] **H10 Retry behavior:** refresh/back/retry after each transition; no duplicate assignment, resolution, escalation, or feedback is created.

Repeat a second path for department handling if the first path used barangay handling (or vice versa).

## I. Negative authorization and privacy checks

For each check, use direct URLs and, where the test harness permits, direct API calls with the wrong test account. Do not use a real person's identifier.

- [ ] **I01 No token:** protected API returns unauthorized and no private data.
- [ ] **I02 Invalid/expired token:** request is rejected; application does not trust browser-stored role alone.
- [ ] **I03 Wrong role:** each role is blocked from other-role actions and data.
- [ ] **I04 Cross-citizen IDOR:** unrelated citizen cannot list, view, mutate, attach evidence, or give feedback to another's complaint.
- [ ] **I05 Cross-organization IDOR:** Barangay Head and department roles cannot cross their barangay/department boundary.
- [ ] **I06 Inactive user:** inactive profile cannot continue API use with an otherwise valid Supabase session.
- [ ] **I07 Anonymous identity:** citizen identity is absent from unauthorized views, payloads, and logs; authorized staff disclosure follows policy.
- [ ] **I08 Attachment path tampering:** changing attachment ID/path cannot disclose a different file; signed link expires as configured.
- [ ] **I09 Report path tampering:** report PDF link is record- and role-scoped.
- [ ] **I10 Mass assignment:** submit extra fields such as owner ID, status, priority, or role; server ignores/rejects protected values.
- [ ] **I11 State tampering:** attempt skipped or reversed status transitions through UI/API; server rejects and history remains unchanged.
- [ ] **I12 Rate limits:** repeated complaint, invitation, and AI requests are limited without exposing internals.
- [ ] **I13 Error disclosure:** malformed IDs/provider failures do not reveal stack traces, credentials, SQL, or private paths.

## J. Usability, reliability, and recovery checks

- [ ] **J01 Loading/empty/error:** each dashboard and list has understandable loading, empty, error, and retry states.
- [ ] **J02 Validation:** errors appear near the field/action and preserve safe user input where appropriate.
- [ ] **J03 Slow network:** slower API response does not allow stale account/role data to render or submit duplicate actions.
- [ ] **J04 API outage:** frontend reports service unavailable and recovers after API returns.
- [ ] **J05 Storage outage:** complaint/resolution/report upload errors are clear; no false success is shown.
- [ ] **J06 AI outage:** assistant failure is contained; regular manual complaint creation still works.
- [ ] **J07 Browser refresh/back:** refresh on dashboard/detail and browser back/forward do not break role or record state.
- [ ] **J08 Keyboard use:** tab order, visible focus, labels, dialogs, and primary actions work without a mouse.
- [ ] **J09 Mobile layout:** forms, tables, attachment controls, dialogs, and navigation fit a narrow screen.
- [ ] **J10 Accessibility basics:** inputs have labels, status is not conveyed by color alone, text contrast is readable.
- [ ] **J11 Date/time:** timestamps are understandable and consistent with the documented local timezone.
- [ ] **J12 Performance:** record first-load and common list/detail responsiveness on target network/device; investigate the known large main JS chunk.
- [ ] **J13 Recovery:** demonstrate test-environment backup restoration and deployment rollback procedure without touching production.

## K. Closeout and final result

- [ ] All failed/blocked cases have a ticket, owner, severity, and retest date.
- [ ] Critical user flows passed for every applicable role.
- [ ] Negative authorization checks passed; any failure blocks release until fixed and retested.
- [ ] Database migration state and PostgreSQL-specific behavior were separately verified.
- [ ] Test accounts and synthetic files/data were cleaned up using the approved test-environment procedure.
- [ ] Evidence is sanitized; no tokens, passwords, personal data, or live signed URLs remain in notes.
- [ ] Test summary and release decision recorded below.

**Passed:** ______  **Failed:** ______  **Blocked:** ______  **N/A:** ______

**Release recommendation:** ☐ Ready for next review  ☐ Not ready  ☐ Blocked by: ____________________

**Known gaps accepted by:** ____________________  **Date:** ____________________

## Important status-state reminder

The current source workflow documents complaint statuses as `submitted`, `under_review`, `accepted`, `declined`, `assigned`, `in_progress`, and `resolved`. Resolution review has its own status such as pending/returned/approved; a pending or returned resolution does not make the complaint `pending_review`. If product requirements change, update workflow docs and this checklist before implementing a different transition.
