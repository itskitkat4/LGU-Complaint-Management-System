# BantaySerbisyo Implementation Tracker

**Last reviewed:** 2026-11-09  
**Purpose:** Track unfinished work against the current project code and `workflow-rule.md`. Work is ordered from major blockers to smaller improvements.

## Status key

- `[ ] NOT STARTED` — work has not been implemented.
- `[ ] IN PROGRESS` — partial implementation exists; work remains.
- `[ ] DECISION NEEDED` — confirm the expected behavior before completing it.
- `[x] DONE` — implemented in the current codebase.

The tracker describes the repository state. Confirm database migrations separately before relying on schema changes in the live Supabase database.

## Priority 0 — Core workflow blockers

These prevent the complaint lifecycle in the requirements from working end to end.

1. **[ ] IN PROGRESS — Complete resolution submission and approval**
   - Department Personnel's `ComplaintWorkDetails.jsx` is still a demo: the form does not save work, resolution details, or evidence.
   - Barangay Heads also need a real way to record progress and submit proposed resolutions.
   - LGU Staff need to review a submitted resolution, approve it, or return it with comments.
   - The `complaint_resolutions` table exists, but the project currently has no resolution model/API workflow connecting submissions, evidence, review decisions, and status changes.
   - **Done when:** both handler roles can submit a resolution; LGU Staff can approve or return it; the complaint status and history are updated; prior submissions remain available for audit.

2. **[ ] DECISION NEEDED — Settle the Barangay escalation reviewer**
   - `workflow-rule.md` says the receiving Department Head reviews, accepts, or redirects a Barangay Head escalation.
   - The implemented API sends pending escalation requests to LGU Staff, who accept or redirect them and route the complaint to a Department Head.
   - Confirm the intended flow with the team/adviser, then align the docs, backend permissions, notification target, and frontend screens.

3. **[ ] IN PROGRESS — Standardize complaint status names and transitions**
   - The workflow document uses `accepted`, `declined`, and `pending_review`.
   - Current review code writes `under_review` for an accepted complaint and `rejected` for a declined complaint. Queue and routing logic still use those values.
   - Migrations allow both vocabularies, so the database currently permits overlapping meanings.
   - **Done when:** the team approves one status vocabulary and every controller, frontend badge/filter, migration constraint, and history event uses it consistently.

## Priority 1 — Important role, citizen, and management workflows

4. **[ ] IN PROGRESS — Connect Citizen Complaint Details to live records**
   - `ComplaintDetails.jsx` displays a fixed `BS-DEMO-001` complaint and sample timeline.
   - Load the selected citizen's actual complaint, status updates, and approved resolution details. Keep access limited to the signed-in citizen's own complaint.

5. **[ ] IN PROGRESS — Finish Department Head monitoring and escalation handling**
   - Complaint assignment and the personnel directory are implemented.
   - The Department Head queue currently focuses on complaints assigned to the head for assignment; it does not provide a full view of all department work after personnel take over.
   - There is an API for recording the outcome of a higher-authority escalation, but no corresponding Department Head UI.
   - **Done when:** the head can monitor department assignments/progress and record an external escalation outcome. Reconcile Barangay escalation responsibilities with Priority 0, item 2.

6. **[ ] NOT STARTED — Connect Citizen notifications to complaint activity**
   - `ComplaintNotification.jsx` is a placeholder; there is no notification API or delivery workflow.
   - Define which status changes produce notifications, then add authorized retrieval/read state and the agreed delivery method.

7. **[ ] NOT STARTED — Connect Citizen feedback to storage**
   - The feedback screen is marked “Demo only.” The `feedback` table exists, but there is no feedback controller or API route.
   - Define when feedback is allowed (for example, after resolution), then implement validation, ownership checks, submission, and confirmation.

8. **[ ] IN PROGRESS — Make role dashboards use live, meaningful data**
   - LGU Staff, Barangay Head, Department Head, and Department Personnel dashboards contain sample counts; some have `loading = false` placeholders.
   - Replace sample values with role-scoped backend summaries and useful links to work that needs attention.

9. **[ ] NOT STARTED — Build Reports and Analytics as a core system feature**
   - There is no reports/analytics page or reporting API. The Admin dashboard currently returns only total users, complaints, barangays, and departments; the staff dashboards show sample figures.
   - Define role-appropriate reports and filters, then implement backend aggregation and frontend visualizations. A useful first release should cover complaint volume and status over time, category breakdown, barangay/department workload, resolution outcomes, and date-range filtering.
   - Restrict each report to the signed-in user's authorized scope (for example, a Barangay Head sees only their barangay and a Department Head sees only their department). Decide whether authorized admins can export reports and in which format.
   - **Done when:** figures come from live database queries, totals match complaint records for the selected scope and date range, and report access is enforced by the backend.

10. **[ ] NOT STARTED — Add complaint-category administration**
   - Admin requirements include managing complaint categories.
   - The API exposes category listing only; there is no authorized create/update/deactivate screen or API.

## Priority 2 — Data integrity, quality, and release readiness

11. **[ ] IN PROGRESS — Apply and verify the Department Head uniqueness migration**
    - Code now checks for an existing active Department Head, and a migration adds a database unique index for one active head per department.
    - Confirm the migration has run on the live Supabase database and verify replacement behavior after a head is deactivated.

12. **[ ] NOT STARTED — Review and run the workflow test suite**
    - Feature tests exist for complaint routing, staff accounts, personnel assignment, and escalation.
    - Add coverage for the final resolution workflow and citizen ownership boundaries, then run the relevant backend and frontend checks after the workflow decisions above are settled.

13. **[ ] NOT STARTED — Prepare a production deployment checklist**
    - Document production environment variables and secret handling, Supabase Auth/Storage settings, CORS, frontend/backend URLs, migration rollout, backups, and a smoke test using each role.

14. **[ ] NOT STARTED — Clean up duplicate route declarations and implementation drift**
    - `routes/api.php` declares the Department Head assignment and external escalation outcome POST routes more than once.
    - Remove duplicates after confirming the intended route behavior, then compare `api-contract.md` and `database-design.md` with the implemented routes and schema.

## Completed

- `[x]` Role-specific staff navigation for LGU Staff, Barangay Head, Department Head, and Department Personnel.
- `[x]` Barangay Head complaint list loads barangay-scoped active assignments and supports submitting an LGU escalation request.
- `[x]` LGU Staff escalation inbox supports accepting or redirecting Barangay Head escalation requests.
- `[x]` Department Head can search active personnel assigned to their department.
- `[x]` Department Personnel can search and filter their current assignment list by status.
- `[x]` LGU Staff Complaint History page lists complaints past initial review, supports search/status filtering, and provides a read-only details view.
- `[x]` Staff account creation prevents more than one active Department Head from being assigned to the same department at the application level; the database index is tracked separately above until its live migration state is confirmed.

## Suggested implementation order

1. Confirm the two workflow decisions: escalation reviewer and approved status vocabulary.
2. Implement resolution submission, evidence, and LGU Staff approval/return as one end-to-end workflow.
3. Connect Citizen Complaint Details and Barangay Head complaint progress to the resulting workflow history.
4. Complete Department Head monitoring and remaining role screens.
5. Build Reports and Analytics, then connect notifications, feedback, live dashboards, and category administration.
6. Verify migrations, tests, documentation, and deployment readiness.
