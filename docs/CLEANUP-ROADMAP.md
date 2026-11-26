# BantaySerbisyo system map and cleanup roadmap

**Reviewed:** 23 November 2026  
**Purpose:** Keep a source-aligned plan for understanding, explaining, simplifying, and safely rewriting this application.  
**Decision:** The repository is suitable for a controlled cleanup, but deployment readiness is **conditional / not yet demonstrated**. Local tests and build pass; production services, database migration state, hosting, and PostgreSQL-only checks remain unverified.

## 1. What the system does

BantaySerbisyo is a complaint-management web application for citizens and Tagoloan LGU staff. The React frontend handles screens and user interaction. Supabase Auth signs users in and provides browser sessions. The Laravel API validates each Supabase access token, applies role and record-level authorization, and reads/writes the application database through Eloquent. The backend also calls Supabase Auth Admin and private Storage, and Groq for the optional complaint drafting assistant.

```text
Browser (React/Vite)
  ├─ Supabase Auth: login/session; sends bearer access token
  └─ Laravel API: validates token → role/ownership checks → PostgreSQL/SQLite
                         ├─ Supabase Auth Admin: staff invitations
                         ├─ Supabase private Storage: complaint/resolution evidence, report PDFs
                         └─ Groq API: optional assistant draft
```

The browser should contain only public Supabase configuration. Database credentials, Supabase secret/service-role keys, and Groq keys belong only in the backend environment.

## 2. Feature and user-flow map

| Feature | Who uses it | Main flow | Source map |
|---|---|---|---|
| Public information and sign-in | Visitor, all roles | Landing page → password or Google sign-in → Supabase session | `frontend/src/pages/public`, `frontend/src/pages/auth`, `frontend/src/context/AuthContext.jsx`, `frontend/src/lib/supabase.js` |
| Profile and onboarding | Citizen, invited staff | API validates profile → citizen completes profile/barangay; invited staff sets password | `frontend/src/pages/auth`, `frontend/src/pages/citizen/Profile.jsx`; `CitizenProfileController`, `StaffAccountController` |
| Submit and track complaints | Citizen | Choose category/barangay, provide incident details/evidence, optionally anonymous → server stores complaint and status history → citizen tracks it | `frontend/src/pages/citizen/CreateComplaint*`, `ComplaintDetails.jsx`, `Dashboard.jsx`; `ComplaintController`, `ComplaintAttachmentController` |
| AI drafting assistant | Citizen | Chat with assistant → receive a draft → citizen reviews and submits through ordinary complaint flow | `ComplaintAssistant.jsx`; `AIComplaintController`, `AIComplaintService` |
| Triage, review, priority, routing | LGU-Staff | Queue/detail → accept/decline with priority → route to barangay or department handling unit | `frontend/src/pages/staff/Complaint*`; `StaffComplaintController` |
| Barangay handling | Barangay Head | Assigned queue/history → start work → optional escalation → submit resolution/evidence | `frontend/src/pages/barangay`; `ComplaintController`, `ComplaintResolutionController` |
| Department handling | Department Head, Department Personnel | Department queue → Head assigns personnel → personnel starts work → optional escalation → submits resolution | `frontend/src/pages/department-head`, `frontend/src/pages/department-personnel`; `DepartmentComplaintController`, `ComplaintResolutionController` |
| Resolution review | LGU-Staff | Review a submitted resolution → approve or return it; complaint remains `in_progress` while resolution review is pending/returned | `frontend/src/pages/staff/ResolutionQueue.jsx`; `ComplaintResolutionController` |
| Feedback and monitoring | Citizen, Barangay Head, Department Head | Citizen rates eligible resolved complaint → scoped staff see monitoring | `frontend/src/pages/citizen/Feedback.jsx`, `frontend/src/pages/shared/FeedbackMonitoring.jsx`; `FeedbackController` |
| Notifications | Citizen and staff UI | API lists recipient-owned notifications; read one/all; frontend updates unread state | `ComplaintNotification.jsx`, `StaffNotifications.jsx`, `NotificationBell.jsx`; `NotificationController` |
| Reports | LGU-Staff | View summary → generate report → upload PDF → obtain signed download link | `StaffReports.jsx`; `StaffReportController`, `Report`, `ReportSummary` |
| Administration | System Administrator | Manage users/invitations, departments, barangays, inspect complaints and dashboard | `frontend/src/pages/admin`; `StaffAccountController`, `DepartmentController`, `BarangayController`, `Admin*Controller` |

### Browser routes

The complete route tree is in `frontend/src/App.jsx`. Public routes cover `/`, `/login`, `/onboarding`, and `/set-password`. Role-protected route groups cover citizen, admin, barangay, department head, department personnel, and LGU staff pages. `ProtectedRoute.jsx` gates rendering based on the backend-validated profile; API authorization remains the security boundary. A wildcard route redirects to `/`.

### API responsibilities

`backend/routes/api.php` is the API route map. Public read-only lookups expose barangays and complaint categories. Other routes use token verification, anonymous-identity redaction, throttling, and role middleware. The route list should remain the canonical mapping between UI actions and controller methods during cleanup.

## 3. Database model in plain language

Laravel migrations define the schema; Eloquent models describe how application code accesses it. The configured default connection is SQLite only when `DB_CONNECTION` is unset; production intent in documentation is PostgreSQL. Confirm the actual deployment target before any migration or rewrite.

| Data group | Tables/models | Purpose and links |
|---|---|---|
| Identity and organization | `users`, `profiles`, `departments`, `barangays`, `complaint_categories` | Profile ID corresponds to the Supabase user ID. Profiles carry role, active state, and optional barangay/department assignment. Departments and barangays are lookup/organizational records. |
| Complaint core | `complaints`, `complaint_updates`, `complaint_assignments` | Complaint is the central record. Updates record status/history events. Assignments record handling unit and assignee; only one active assignment per complaint is intended. |
| Evidence and resolution | `complaint_attachments`, `complaint_resolutions`, `complaint_resolution_attachments` | Evidence is stored as metadata/path in the database and bytes in private Storage. Resolution submission/review is separate from the complaint's status. |
| Escalation and citizen response | `complaint_escalations`, `feedback` | Escalation records a request and outcome. Feedback references a resolved complaint and its owner; an additive migration enforces ownership at database level. |
| Communication and reporting | `notifications`, `reports`, `report_summaries` | Notifications are recipient-scoped. Reports store generated summary metadata and PDF storage path. |
| Framework support | `cache`, `jobs`, `personal_access_tokens` | Laravel starter tables; confirm which are operationally used before removal. `personal_access_tokens` may be redundant if only Supabase bearer auth is used, but do not remove without repository and deployment evidence. |

### Complaint state explanation

Canonical complaint statuses in source constraints: `submitted → under_review → accepted` or `declined`; accepted complaints are routed and become `assigned → in_progress → resolved`. `pending_review` belongs to a **resolution review**, not the complaint status. A returned resolution leaves the complaint in progress. `resolved` is final according to current source documentation. The review found no separate human-readable tracking number; complaint UUIDs are currently the identifier. Confirm this product requirement before rewriting.

### Migration safety

The repository contains 34 migration files, including corrective/status migrations and additive constraints. Treat migrations as an append-only history. Do not rewrite or delete already-applied migrations as a code-cleanup shortcut. Before schema changes: back up, inspect deployed migration history and data, test upgrade and rollback on a disposable PostgreSQL copy, and add a new migration. Several migration filenames encode historical corrections; simplify understanding with an ERD/data dictionary rather than erasing provenance.

## 4. Security review summary

**Source-level picture:** Authentication uses Supabase Auth tokens verified server-side; route middleware checks roles. Controllers also scope records by authenticated owner, assignment, department, or barangay. Anonymous complaint identity is redacted in API responses. Signed URLs mediate private object access. AI has input limits and per-user throttling. Recent source fixes address stale assignment authorization, signed evidence access, duplicate active heads, and feedback ownership.

**Not proven by this checkout:** deployed Supabase JWT/provider settings; database grants/RLS; Storage bucket privacy and object policies; secret rotation; production `APP_DEBUG=false`; TLS and CORS; response security headers; deployed database/migration state; live OAuth redirects; Groq account/data-retention configuration; production backups/restore and monitoring. Mark each verified only after deployment evidence is reviewed.

**Security work before deployment:** confirm least-privilege service credentials, private buckets and short-lived signed links, production HTTPS and exact CORS origins, secret storage/rotation, rate limits at the proxy as well as app, log redaction/retention, database backup/restore, and authorization checks for each role and record boundary. Do not expose private environment files while doing this review.

## 5. Bugs, gaps, and future-risk register

The detailed historical bug analysis is in `AUDIT-REPORT.md`. BUG-001 through BUG-008 are source-level fixed/mitigated findings; database migration deployment is not implied by a file existing. No new exploit was asserted in this roadmap.

| Priority | Gap / risk | Why it matters | Next action |
|---|---|---|---|
| P0 deployment | Live Supabase, database, Storage, OAuth, Groq, CORS, HTTPS, secrets, and production flags are unverified | Local success does not establish a safe production deployment | Complete an environment-specific release checklist and evidence each item |
| P0 deployment | PostgreSQL-specific suite was not run in this review | SQLite tests cannot prove PostgreSQL migration/catalog/query behavior | Run `composer test:postgres` only against the specifically marked disposable local DB described in `backend/POSTGRES_TESTING.md` |
| P1 product | No human-readable complaint tracking number was found | Citizens may need a reference number easier to read/share than UUID | Confirm requirement with project owner/panel; define uniqueness and privacy expectations |
| P1 operations | No production hosting/CI/CD/monitoring/backup plan found in this repository | Deployment/recovery steps cannot be reproduced from source | Document provider, release, rollback, migration, alert, backup/restore procedures |
| P1 performance | Main frontend bundle is ~1.42 MB minified; Vite warns over 500 kB | Slower initial loading, especially on mobile/slow links | Lazy-load role routes and PDF/report dependencies; measure after change |
| P1 schema | Migration history contains multiple corrective status migrations | Future maintainers can misunderstand canonical status rules | Add migration timeline and invariant tests; retain history |
| P2 configuration | No frontend `.env.example` was present at audit time; docs describe vars | New developer setup can diverge or silently misconfigure | Add safe placeholder example (public vars only) and validate required vars at startup |
| P2 code structure | Business rules sit in large controllers and pages | Harder to explain and regression-test one feature | Extract small actions/services and view components during feature-sliced rewrite |
| P2 quality | Backend static analysis / coverage threshold and CI config not found in repository scan | Passing tests do not catch all typing, dead-code, and integration gaps | Select PHP static analysis and CI gate after baseline is recorded |
| P2 docs | Existing database-design document has a migration reference conflict (see `AUDIT-REPORT.md`) | ERD and actual schema may disagree | Correct docs against migrations and models before the panel explanation |
| P2 operations | `DatabaseSeeder` seeds a generic test user; production seeding policy needs review | Accidental demo account/data risk if production seeding is broad | Ensure production deploy never runs development seeders; define safe reference-data seed path |

## 6. Verification performed for this review

| Check | Result | What it proves / does not prove |
|---|---|---|
| `php artisan test` in backend | 254 tests reported: 251 passed, 3 skipped; 1,126 assertions | Current SQLite-configured test suite passes; skipped tests and PostgreSQL behavior remain separate |
| `npm.cmd test -- --reporter=dot` | 10 files, 66 tests passed | Existing frontend component/API behavior covered by current tests |
| `npm.cmd run lint` | Passed | ESLint configured rules report no errors. It does not prove every PHP import/dependency is used. |
| `npm.cmd run build` | Passed; 327 modules; main chunk 1,420.14 kB | Production bundle can be generated locally; does not prove deployed environment integration |
| `composer validate --no-check-publish` | Passed | Composer manifest syntax/schema is valid |
| PostgreSQL suite | Not run | Runner intentionally refuses unless an explicitly marked disposable local DB is selected |
| Live services/deployment | Not run | No production or Supabase account state inspected |

## 7. What to rewrite and cleanup checklist

Use small, reversible slices. Preserve tests and behavior first, then refactor one complete flow at a time. The lists below are rewrite targets, not deletions authorized by evidence. Keep a branch and review the diff after every slice.

### Phase 0 — baseline and safety

- [ ] Keep the existing working tree changes intact; record a separate baseline commit/branch before cleanup.
- [ ] Read `AUDIT-REPORT.md`, `DASHBOARD-DATA-AUDIT.md`, this roadmap, and `docs/{workflow-rule,database-design,erd-guide,api-contract}.md`.
- [ ] Agree on product decisions: tracking number, complaint final state, anonymity behavior, retention, and which reports/roles are required.
- [ ] Record current route/API pairs and test commands/results. Maintain an explicit before/after behavior checklist.
- [ ] Inventory secrets and deployment configuration without copying secret values into documentation or logs.

### Phase 1 — explain the database and workflow before changing code

- [ ] Reconcile `docs/database-design.md` and `docs/erd-guide.md` with all 34 migration files and all 16 models.
- [ ] Document every table's primary key, foreign keys, nullable columns, indexes, owner scope, lifecycle, and storage-vs-file boundary.
- [ ] Draw one ERD and one complaint/resolution state diagram from source truth.
- [ ] Explain transaction/locking and active-assignment constraints using `ComplaintAssignment`, `ComplaintUpdate`, and relevant controllers.
- [ ] Verify production migration history and feedback-ownership constraint state with a safe read-only release audit.

### Phase 2 — frontend, by end-to-end feature

Rewrite/refactor targets (keep route paths and API payloads stable initially):

- [ ] App shell/auth: `frontend/src/App.jsx`, `main.jsx`, `context/AuthContext.jsx`, `context/ThemeContext.jsx`, `components/protected/ProtectedRoute.jsx`, `lib/supabase.js`, `lib/signOut.js`.
- [ ] API boundary: `frontend/src/lib/api.js`; clarify token retrieval, error mapping, pagination, and request helpers before editing individual screens.
- [ ] Shared presentation: `components/ui.jsx`, `components/NotificationBell.jsx`, `components/PercentageBar.jsx`, `layouts/*.jsx`, `layouts/citizenLayoutUtils.jsx`.
- [ ] Citizen flow: `pages/citizen/{CreateComplaint.jsx,CreateComplaintComponents.jsx,complaintEvidence.js,ComplaintAssistant.jsx,ComplaintDetails.jsx,Dashboard.jsx,ComplaintNotification.jsx,Feedback.jsx,Profile.jsx,HelpSupport.jsx,Landing.jsx}`.
- [ ] Staff flow: `pages/staff/{ComplaintQueue.jsx,ComplaintReview.jsx,ComplaintReviewComponents.jsx,ComplaintReviewPanels.jsx,ComplaintHistory.jsx,ResolutionQueue.jsx,EscalationInbox.jsx,StaffNotifications.jsx,StaffReports.jsx,Dashboard.jsx}`.
- [ ] Department Head flow: `pages/department-head/{Dashboard.jsx,ComplaintAssignment.jsx,DepartmentMonitoring.jsx,PersonnelDirectory.jsx}`.
- [ ] Department Personnel flow: `pages/department-personnel/{Dashboard.jsx,MyAssignments.jsx,ComplaintWorkDetails.jsx}`.
- [ ] Barangay Head flow: `pages/barangay/{Dashboard.jsx,AssignedComplaints.jsx,ComplaintHistory.jsx}`.
- [ ] Administration flow: `pages/admin/{Dashboard.jsx,Complaints.jsx,UserManagement.jsx,UserManagementSections.jsx,DepartmentPage.jsx,BarangayPage.jsx}`.
- [ ] Public/auth pages: `pages/public/Landing.jsx`, `pages/auth/{Login.jsx,LoginComponents.jsx,LoginPanels.jsx,Onboarding.jsx,SetPassword.jsx}`, `pages/shared/FeedbackMonitoring.jsx`.
- [ ] Styling/assets: `App.css`, `index.css`, `index.html`, `public/*`, `src/assets/*`; remove/replace only after checking imports and branding requirements.
- [ ] Preserve/extend feature tests next to each flow; do not delete tests just because they are small or currently pass.

### Phase 3 — backend, by domain boundary

- [ ] API map: `backend/routes/api.php`; group consistently by public/authenticated role and use named route comments only for real domain concepts.
- [ ] Authentication/authorization: `app/Http/Middleware/{VerifySupabaseToken,CheckRole,RedactAnonymousComplaintIdentity}.php`, `app/Providers/AppServiceProvider.php`.
- [ ] Citizen complaint domain: `app/Http/Controllers/Api/{ComplaintController,CitizenProfileController,ComplaintCategoryController,BarangayController,ComplaintAttachmentController,AIComplaintController}.php`; `app/Services/{AIComplaintService,SupabaseStorageService}.php`.
- [ ] Staff review/routing domain: `StaffComplaintController.php`, `StaffAccountController.php`, `AdminComplaintController.php`, `AdminDashboardController.php`, `DepartmentController.php`.
- [ ] Handling/resolution domain: `DepartmentComplaintController.php`, `ComplaintResolutionController.php`, and escalation/assignment logic in `ComplaintController.php`.
- [ ] Feedback/notification/report/dashboard domains: `FeedbackController.php`, `NotificationController.php`, `StaffReportController.php`, `DashboardSummaryController.php`.
- [ ] Models (all 16): `app/Models/{Barangay,Complaint,ComplaintAssignment,ComplaintAttachment,ComplaintCategory,ComplaintEscalation,ComplaintResolution,ComplaintResolutionAttachment,ComplaintUpdate,Department,Feedback,Notification,Profile,Report,ReportSummary,User}.php`.
- [ ] Service and API client boundaries: `SupabaseAdminService.php`, `SupabaseStorageService.php`, `AIComplaintService.php`; document failure modes and retry/idempotency behavior.
- [ ] Config: `config/{app,auth,cache,cors,database,filesystems,logging,mail,queue,sanctum,services,session}.php`, `bootstrap/{app,providers}.php`; preserve framework defaults unless proven unused.
- [ ] Schema/reference data: migrations (review, do not rewrite applied history), `database/{factories,seeders}/*`; explain each migration in chronological notes and guard production seed behavior.
- [ ] Tests: retain all behavior/security/regression tests. Review only `ExampleTest.php` scaffolds for deletion; keep `DatabaseIsolationProbeTest.php` and Postgres tests unless their purpose is demonstrated obsolete.

### Phase 4 — cleanup candidates (verify before removal)

- [ ] `backend/app/Providers/AppServiceProvider.php.bak-before-api-throttling` and `backend/routes/api.php.bak-before-api-throttling`: compare with current source and git history; if redundant, remove in a dedicated cleanup change.
- [ ] `backend/tests/Feature/ExampleTest.php` and `backend/tests/Unit/ExampleTest.php`: likely Laravel scaffolds; verify they assert no product behavior before removal.
- [ ] `backend/package.json` and `backend/vite.config.js`: Laravel asset toolchain files. Determine whether the backend Blade page/build actually uses them before removing Node dependencies.
- [ ] `backend/resources/css/app.css`, `resources/js/app.js`, `resources/views/welcome.blade.php`: starter UI; verify if the API root or deployment depends on it.
- [ ] `backend/database/migrations/*`, `composer.lock`, `frontend/package-lock.json`: never remove as “unimportant” without migration/dependency impact analysis.
- [ ] `frontend/dist/`, `frontend/node_modules/`, `backend/vendor/`, framework caches/logs, `.env*`: generated, local, or secret-bearing. Do not commit or document their values; confirm ignore/release policy rather than deleting local files during code cleanup.
- [ ] `mobile/`: currently appears removed in the working tree. Do not restore or make additional edits until the current intended scope is confirmed via git history/owner decision.
- [ ] Unused imports: frontend ESLint passed, so no currently configured lint error identifies these. PHP unused imports and runtime dependencies need dedicated static/reference analysis; do not guess-delete.
- [ ] Dependencies: every direct frontend runtime dependency has a source use (`supabase-js`, `jspdf`, `jspdf-autotable`, `react`, `react-dom`, `react-router-dom`, `sweetalert2`). Testing packages are used by tests. No dependency is approved for removal by this review. Audit Composer direct dependencies against imports/artisan/build usage separately.

### Phase 5 — after each refactor slice

- [ ] Run targeted regression tests, full backend and frontend test suites, ESLint, and production build.
- [ ] Run PHP formatting/static-analysis checks selected by the project; record any newly added tooling as a separate decision.
- [ ] Compare API contract, route behavior, database writes, status history, authorization, and UI loading/error/empty states.
- [ ] Check keyboard/mobile behavior and slow-network/error scenarios for changed screens.
- [ ] Review diff for secret exposure, accidental schema rewrite, generated files, changed authorization scope, and unexplained deletes.

## 8. Recommended rewrite order

1. Documentation and ERD/state model; decide requirements that affect schema.
2. Auth/profile + API client boundary (every protected screen depends on it).
3. Citizen submit → evidence → tracking → notification/feedback.
4. LGU-Staff triage → priority → routing.
5. Barangay and department assignment/start-work flows.
6. Resolution submission/review and escalation outcomes.
7. Admin accounts/departments/barangays.
8. Dashboards, reports, PDFs, feedback monitoring, visual polish/performance.
9. Production deployment, PostgreSQL integration evidence, security and recovery checks.

Keep an end-to-end feature working at every checkpoint. Prefer readable names, small functions, one responsibility per component/controller action, explicit request/response shapes, and comments that explain decisions rather than restating code.

## 9. Panel explanation script

“A citizen signs in through Supabase. The browser sends the access token to Laravel. Laravel verifies the token and checks the user’s application profile, role, and ownership/assignment. A complaint row stores the report and its current status; separate update rows preserve status history. Assignment rows show who is actively handling it. Evidence bytes live in private object storage while the database stores metadata and paths. A handler submits a resolution, which staff review separately; only the approved workflow moves the complaint to resolved. Feedback, notifications, escalation, and reports are separate records linked to the complaint or recipient so each workflow has a clear purpose. Migrations describe schema evolution; models map rows to application objects; controllers coordinate validated requests; services isolate calls to external providers.”

## 10. Deployment go/no-go checklist

- [ ] Production database is PostgreSQL (or the documented approved target); backup is verified and restore tested.
- [ ] All migrations, including feedback ownership and recent status/assignment constraints, are applied and production data passes integrity checks.
- [ ] PostgreSQL-only suite passes against an isolated marked disposable database.
- [ ] Supabase Auth/JWT issuer/audience/provider/redirect settings are verified; user roles and deactivation behavior are tested.
- [ ] Storage buckets are private; policies, ownership checks, signed URL expiry, and file validation are verified.
- [ ] Secrets are held by hosting secret manager; no secrets in frontend bundle/repo/logs; key rotation documented.
- [ ] `APP_DEBUG=false`, HTTPS, exact CORS origins, security headers, rate limits, and trusted proxy settings verified.
- [ ] Groq configuration, retention/privacy requirements, timeout and outage behavior are accepted; assistant remains optional.
- [ ] Frontend/API production URLs, SPA fallback, health checks, logs/alerts, backups, rollback, and migration procedure documented.
- [ ] Release version builds from clean lockfile installs; smoke-check every role’s critical path.
- [ ] Resolve or explicitly accept the large initial JS bundle warning and confirm performance on target devices/networks.

**Current verdict:** Local code checks pass, but do not label the system production-ready until every applicable deployment item above is evidenced. The PostgreSQL test suite and all external/live configuration remain outstanding.
