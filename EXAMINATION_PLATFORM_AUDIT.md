# HBPL Examination Platform Audit

Audit date: 28 September 2026

Scope: existing Django backend, both Next.js frontends, legacy Django templates, examination creation, registration, student/admin workflows, content, files, notifications, and the proposed multi-session/multi-exam direction.

This report is intentionally an audit only. It does not change application code or database data.

## Executive summary

The repository currently contains two examination implementations that are not connected:

1. The live public flow is a legacy, global `api.ExamRegistration` flow. It has no exam selector, no session, no student account, no draft/submission workflow, no application status, and no examination-specific configuration.
2. A newer `exams` Django app contains `Exam`, `ExamResult`, `AdmitCard`, and `Certificate` models, but these are currently admin-only scaffolding. There is no public API, staff API, or frontend route using them.

There are currently three user-facing surfaces: `frontend/hbpl`, `new-ui/new-hbpl-ui`, and the server-rendered Django templates. The confirmed product direction is now `new-ui/new-hbpl-ui` as the only active Next.js frontend, with Django REST Framework as the primary API. `frontend/hbpl` and the server-rendered templates should be treated as deprecated compatibility surfaces and should not receive new examination features.

The main conclusion is that multi-session/multi-exam support should be built around one canonical domain model and API, while the current global registration endpoints remain as a temporary compatibility layer. A safe first implementation needs a data migration and frontend ownership decision before old registration fields are removed.

## Current architecture

### Backend

- Django 5.2 project in `backend/`.
- Public and staff APIs are in `backend/api/` and are mounted below `/api/`.
- A separate `backend/exams/` app contains the newer normalized examination tables.
- `backend/core/` contains reusable media, admin roles/permissions, audit logs, system configuration, notification templates, and notifications.
- `backend/cms/` contains generic pages, sections, banners, announcements, and site settings.
- `backend/hbpl/` contains legacy server-rendered pages and PDF/download views.
- Authentication currently uses Django's built-in `User`, DRF token authentication, and JWT authentication. There is no student account/profile implementation.

### Frontends

- `new-ui/new-hbpl-ui/` is the active Next.js application with the public portal and staff UI at `/staff`.
- Django REST Framework in `backend/api/` is the primary API layer.
- `frontend/hbpl/` is deprecated/compatibility-only.
- `backend/hbpl/templates/hbpl/` is a legacy server-rendered compatibility surface.

The three surfaces do not share a canonical examination data contract. The two Next.js applications both call the old `/api/exam/...` endpoints.

## Examination creation audit

### What exists today

The normalized `exams.Exam` model is the closest existing foundation. It has a category, name, slug, academic year, status, description, eligibility, fee, registration limits, exam date, result date, registration window, cover image, brochure, and timestamps ([backend/exams/models.py](C:/Users/elske/Desktop/hbpl/backend/exams/models.py:38)). `ExamTimeline` provides exam-related timeline rows ([backend/exams/models.py](C:/Users/elske/Desktop/hbpl/backend/exams/models.py:81)).

However:

- There is no `Session` model or relationship from `Exam` to a session.
- There is no public or staff REST endpoint for creating/editing an `Exam`.
- The only practical creation path is Django admin ([backend/exams/admin.py](C:/Users/elske/Desktop/hbpl/backend/exams/admin.py:27)).
- There is no frontend exam editor.
- The model does not include a stable exam code/application prefix, title/subtitle, instructions, syllabus/important-information fields, explicit publication flag, created-by metadata, or a clear timezone-aware registration/exam schedule.
- Exam status is being used as both operational state and visibility/publishing state, which will become limiting when drafts and scheduled publication are needed.

### Confirmed active staff entry point

The active staff shell is `/staff` in `new-ui/new-hbpl-ui`. Its current examination navigation exposes:

- `/staff/exam-portal`: management of global portal content such as important dates, support schools, syllabus, sample papers, centres, FAQs, and toppers ([new-ui/new-hbpl-ui/app/staff/exam-portal/page.tsx](C:/Users/elske/Desktop/hbpl/new-ui/new-hbpl-ui/app/staff/exam-portal/page.tsx:21)).
- `/staff/exam-students`: management of legacy `ExamRegistration` students, imports, marks, test copies, exports, and document generation ([new-ui/new-hbpl-ui/app/staff/exam-students/page.tsx](C:/Users/elske/Desktop/hbpl/new-ui/new-hbpl-ui/app/staff/exam-students/page.tsx:54)).

At audit time, the staff navigation does not expose a separate session/exam CRUD screen, and these screens call `/api/admin/exam/...` legacy endpoints rather than normalized `exams.Exam` endpoints ([new-ui/new-hbpl-ui/app/staff/layout.tsx](C:/Users/elske/Desktop/hbpl/new-ui/new-hbpl-ui/app/staff/layout.tsx:29), [new-ui/new-hbpl-ui/app/staff/exam-portal/page.tsx](C:/Users/elske/Desktop/hbpl/new-ui/new-hbpl-ui/app/staff/exam-portal/page.tsx:65)). Therefore, `/staff` is the correct place to add exam/session management, but the current implementation is portal-content and student-record management, not canonical exam creation yet.

### What the live portal actually creates

The public registration endpoint creates `api.ExamRegistration` records ([backend/api/views.py](C:/Users/elske/Desktop/hbpl/backend/api/views.py:523)). The model is global and has no foreign key to an exam, session, student, school, or centre ([backend/api/models.py](C:/Users/elske/Desktop/hbpl/backend/api/models.py:176)).

The generated number is globally prefixed with `HBPL2026` ([backend/api/models.py](C:/Users/elske/Desktop/hbpl/backend/api/models.py:177)). It is not scoped to an exam or session. The public serializer also accepts `roll_number` ([backend/api/serializers.py](C:/Users/elske/Desktop/hbpl/backend/api/serializers.py:221)), so the current API contract treats an assigned identity as client input rather than a server-owned application number.

The only global registration control is the singleton `ExamSettings.registration_closed` flag ([backend/api/models.py](C:/Users/elske/Desktop/hbpl/backend/api/models.py:355)). There is no per-exam registration window, capacity enforcement, fee, eligibility check, or application uniqueness rule.

### Existing old content is global

Important dates, support schools, syllabus items, sample papers, centres, FAQs, and toppers are exposed by a global portal-content endpoint ([backend/api/views.py](C:/Users/elske/Desktop/hbpl/backend/api/views.py:681)). They are not attached to an exam. `ExamCenterDetail` is content/configuration with string ranges, not a normalized centre allocation model.

### Hard-coded examination identity

The legacy PDF views contain a hard-coded examination name and centre ([backend/hbpl/views.py](C:/Users/elske/Desktop/hbpl/backend/hbpl/views.py:176)). The primary Next.js portal also hard-codes the 2026 examination name and descriptive content ([frontend/hbpl/src/screens/HBPL_Examportal.tsx](C:/Users/elske/Desktop/hbpl/frontend/hbpl/src/screens/HBPL_Examportal.tsx:113)). The alternate UI has another hard-coded portal implementation.

## Registration and student workflow audit

### Current flow

The public flow is:

1. User opens one global registration form.
2. User submits personal details, school/class/address, image/signature, and optional client-supplied roll number.
3. Backend creates `ExamRegistration` and generates a roll number if one was not supplied.
4. A post-save signal sends a confirmation email immediately ([backend/api/signals.py](C:/Users/elske/Desktop/hbpl/backend/api/signals.py:11)).
5. User later looks up result, admit card, certificate, or grievance using roll number plus date of birth.

The active Next.js frontend submits directly to the legacy endpoint ([new-ui/new-hbpl-ui/src/lib/api.ts](C:/Users/elske/Desktop/hbpl/new-ui/new-hbpl-ui/src/lib/api.ts:398)). The deprecated frontend also has an old client, but it is out of scope for the new examination implementation.

### Missing student capabilities

- No student sign-up, login, logout, password reset, or email verification.
- No student profile or reusable details for future applications.
- No application draft/save/resume flow.
- No explicit submit action separate from save.
- No application review status such as submitted, under review, correction required, approved, rejected, or withdrawn.
- No student dashboard listing applications.
- No student-facing correction/re-upload flow.
- No exam-specific application number or ownership check.

### Existing staff capabilities

Staff can list, search, import/export, upload marks/test copies, generate documents, and publish old registration results/admit cards through the old APIs. These operations are all based on `ExamRegistration` and therefore are not exam-scoped.

The newer normalized result/admin code is incomplete. For example, `ExamResultAdmin` searches through `registration__student_name` and `registration__reg_number`, but the referenced legacy registration uses `full_name` and `roll_number` ([backend/exams/admin.py](C:/Users/elske/Desktop/hbpl/backend/exams/admin.py:51)). This is evidence that the normalized layer has not yet been integrated end-to-end.

## Files, results, admit cards, and certificates

- Legacy registration stores student image, signature, test copy, result, admit card, and certificate files on one record.
- New normalized `ExamResult`, `AdmitCard`, and `Certificate` models exist ([backend/exams/models.py](C:/Users/elske/Desktop/hbpl/backend/exams/models.py:96), [backend/exams/models.py](C:/Users/elske/Desktop/hbpl/backend/exams/models.py:177), [backend/exams/models.py](C:/Users/elske/Desktop/hbpl/backend/exams/models.py:206)), but they point back to the legacy registration rather than a student application.
- PDF generation is hard-coded to the legacy examination and fixed layouts.
- There is no normalized centre allocation/hall-ticket workflow.
- There is no result publication workflow attached to an exam/session/application lifecycle.
- File access and document ownership are based largely on roll number plus date of birth, not authenticated student ownership.

The existing `core.MediaAsset` and `AuditLog` models are useful foundations, but they are not currently connected to the examination application lifecycle.

## Admin, authorization, and auditability

The backend has a useful staff baseline: token login, staff checks, Django model permissions, admin roles/permissions, and an `AuditLog`. The examination API surface, however, is still the old registration API. There is no role-aware exam/session/application API, no explicit transition audit for application decisions, and no structured record of who approved/rejected/corrected an application.

The default DRF permission is `AllowAny`; individual protected views must opt into authentication. This is acceptable for deliberately public content, but the future application endpoints must explicitly enforce authenticated ownership and staff role permissions.

## Data and migration findings

The local SQLite database currently contains:

- 6 Django users.
- 32 legacy `api.ExamRegistration` rows.
- 1 `ExamSettings` row.
- 0 normalized `exams.Exam` rows.
- 0 normalized results, admit cards, or certificates.
- 0 `ExamImportantDate` rows and 0 `ExamCenterDetail` rows.

This means the normalized examination schema is not merely incomplete in code; it is also empty in the current data store while the legacy table already contains real registration data.

### Migration risks

1. Existing registrations have no exam identity. They must be assigned to a created legacy exam before an exam foreign key can become required.
2. Existing rows have no student account. Automatic account creation can create duplicates or incorrectly merge people because email/phone may be missing or shared.
3. Existing global content must be mapped to a legacy exam or deliberately retained as site-wide content.
4. Existing `HBPL2026...` roll numbers must remain retrievable. They should be preserved as legacy identifiers even if new applications use exam-scoped application numbers.
5. Old result/admit-card/certificate fields and the new normalized tables represent overlapping concepts. A dual-write or one-time backfill plan is required before switching reads.
6. The old endpoints are already consumed by both Next.js applications and the Django templates. Removing them immediately would break deployed clients.
7. The current roll-number generator calculates the next value by querying existing rows. A new per-exam sequence must be concurrency-safe and server-owned.

## Recommended Phase 1 target design

### Canonical hierarchy

`ExaminationSession` → `Exam` → `ExamApplication` → `ApplicationDocument`

Recommended core entities:

- `ExaminationSession`: stable code, display name, academic year/period, description, active/published state, ordering, timestamps.
- `Exam`: session foreign key, stable code/slug, title/subtitle, description, eligibility, instructions, syllabus/important information, fee, capacity, registration window, exam schedule, result schedule, publication state, operational status, cover/brochure media.
- `StudentProfile`: one-to-one with Django `User`, with reusable candidate details and school reference.
- `School`: normalized school name/address/contact/status, with an optional free-text snapshot on the application for historical accuracy.
- `ExamCentre`: exam/session-specific centre details and capacity. Keep centre allocation separate from generic CMS content.
- `ExamApplication`: exam and student foreign keys, server-generated application number, candidate snapshot fields, status, submission/review timestamps, review notes, and audit actors.
- `ApplicationDocument`: application, document type, file, verification state, and reviewer metadata.
- `ApplicationNumberSequence`: one row per exam or a database-backed sequence, locked transactionally when issuing numbers.

The first implementation may keep a simple document set of photo, signature, and required proof files, but it should be modelled separately from the application so future document types do not require schema changes.

### Application state machine

Recommended states:

`draft` → `submitted` → `under_review` → `correction_required` → `resubmitted` → `approved` or `rejected`

Optional terminal state: `withdrawn`.

Every transition should be server-side, permission checked, timestamped, and written to an application audit/event table. A draft must not consume a final application number unless that is an explicit product decision.

### Session and exam status separation

Keep these concepts separate:

- Visibility: draft, published, archived.
- Registration: not open, open, closed.
- Delivery: upcoming, ongoing, completed.
- Results: pending, published.

The current single `Exam.status` choice combines several of these concerns and should be retained only as a compatibility field or replaced with explicit fields/enums during Phase 1.

### API boundary

The new API should be exam-scoped and versioned, for example:

- `GET /api/v1/exam-sessions/`
- `GET /api/v1/exams/`
- `GET /api/v1/exams/{slug}/`
- `POST /api/v1/auth/register/`, login, refresh, password reset, and profile endpoints
- `POST /api/v1/exams/{exam_id}/applications/`
- `PATCH /api/v1/applications/{id}/` for owned drafts
- `POST /api/v1/applications/{id}/submit/`
- `GET /api/v1/me/applications/`
- staff endpoints for sessions, exams, applications, review transitions, documents, centres, and exports

The current `/api/exam/...` routes should remain as a compatibility layer for the legacy exam until both frontends and deployed clients are migrated.

### Frontend direction

The authoritative frontend is `new-ui/new-hbpl-ui`, with `/staff` as the staff entry point. The authoritative API is Django REST Framework. All new examination/session/application screens and API clients should be implemented in this pair. `frontend/hbpl` and the Django templates should remain compatibility-only until their legacy routes can be retired.

The target public experience should include:

- session and exam listing;
- exam detail/configurable content page;
- account creation and login;
- reusable student profile;
- application draft and resume;
- document upload and validation;
- review/confirmation screen;
- submit and application-number confirmation;
- student dashboard with status and messages.

The staff experience should include:

- session list and session detail;
- exam create/edit/publish/close;
- rich text fields with server-side sanitization;
- application review queue and filters by session/exam/status;
- correction requests, approval/rejection, and document review;
- exam-scoped exports and bulk operations;
- audit timeline.

The deprecated frontend and server-rendered routes should continue serving legacy compatibility pages only during migration. They should not receive a second independent implementation of the new domain.

## Content and rich text recommendation

The existing generic CMS can continue to manage site-wide pages. Exam-specific content should live with the exam/session domain so a future exam cannot accidentally display another exam's dates, syllabus, FAQs, or centres.

For Phase 1, use a small set of controlled rich-text fields or structured content blocks rather than allowing arbitrary HTML everywhere. Any HTML must be sanitized on the server before storage/rendering. Keep important dates, centres, fees, eligibility, and deadlines as structured fields so they remain searchable and enforceable.

## Email and notification recommendation

Keep Django's existing email configuration, but move exam notifications out of model `post_save` signals into explicit application services/events. At minimum:

- application submitted;
- correction required;
- application approved;
- application rejected;
- admit card published;
- result published.

An outbox/retry mechanism should be added when operational volume warrants it. Email failure must be observable and must not silently make a successful application appear incomplete.

## Safe implementation sequence

1. Decide the authoritative frontend and confirm whether Phase 1 requires authenticated student accounts immediately or supports a short-lived guest-to-account migration.
2. Add session, student, school, centre, application, document, sequence, and application-event models without removing legacy tables.
3. Create a legacy session and legacy exam representing the current HBPL 2026 registration.
4. Map old global content to that legacy exam.
5. Backfill legacy registrations into an explicitly marked legacy application/import representation while preserving old roll numbers and files.
6. Add authenticated exam/application APIs and permissions.
7. Build the new public exam listing, detail, account, application, and dashboard flow in the chosen Next.js application.
8. Build staff session/exam/application review screens and exam-scoped exports.
9. Add automated backend API/model tests and frontend tests for the new flow.
10. Run a staging migration, compare counts/files, switch reads behind a feature flag, and retain old routes until production clients have migrated.
11. Only after validation, make exam/session relationships mandatory for new records and deprecate the old global write endpoint.

## Baseline verification

- Django `manage.py check`: passed.
- Django `manage.py test --noinput`: passed with **0 tests found**; automated coverage is currently absent.
- Primary frontend TypeScript/build baseline was previously successful in this workspace.
- Primary frontend lint currently reports 7 errors and 29 warnings.
- Alternate frontend TypeScript check was previously successful; its production build is blocked in this environment by Google Fonts network access.
- Alternate frontend lint currently reports 23 errors and 76 warnings.
- Current git changes before this report are unrelated live-cricket polling changes in `new-ui/new-hbpl-ui/src/components/LiveCricketWidget.tsx` and `new-ui/new-hbpl-ui/src/components/Ticker.tsx`; they were preserved.

## Audit conclusion

The requested multi-session/multi-exam redesign is feasible, but the existing `Exam` model cannot simply be exposed as-is. The primary work is domain consolidation: introduce session ownership, authenticated students, exam-scoped applications, review states, document records, and a single API/frontend contract, then migrate the 32 legacy registrations without losing their identifiers or files.

This audit is the safe stopping point before implementation. The target model is now scoped to Django REST Framework plus `new-ui/new-hbpl-ui` and its `/staff` console. The next step is additive migrations and API tests before replacing the legacy registration flow in the active UI.
