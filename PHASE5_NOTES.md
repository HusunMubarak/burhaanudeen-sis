# Phase 5 Delivery Notes

This picks up the Phase 5 brief (reports, documents, portals, communication) on
top of the existing Phases 1–4 codebase. Nothing in Phases 1–4 was rebuilt —
everything below is additive, following the existing conventions (zod
validation in `src/lib/validation.ts`, `requireModuleAccess`/`requireRole` on
every API route, audit logging on writes, server components fetching data and
handing it to small client components for interactivity).

## Before you run this

```bash
npm install
npm run db:generate   # regenerates the Prisma client for the new models
npm run db:push        # or db:migrate, per your existing workflow — adds
                        # Notification, Guardian, and the new columns on
                        # Announcement/GalleryImage
npm run build           # full type-check
npm test                 # vitest
```

**I could not run `db:generate` or `next build` myself** — this sandbox's
network allowlist doesn't include `binaries.prisma.sh`, which Prisma 7's CLI
needs even just to generate the client. I wrote the new/changed files by hand
against the schema, double-checking every model/field name I used against
`prisma/schema.prisma`, and I ran ESLint and the full Vitest suite (230/230
passing, no regressions) — but a real `tsc`/`next build` pass is something
you'll want to do before deploying, since I couldn't catch type errors the
way I normally would.

## What's implemented

**Report Centre** (`/admin/reports`) — Students (all / by class / by gender /
new admissions / withdrawals / graduates), Admissions (applications / pending
& verified payments / accepted / rejected / enrolled), and Attendance (daily /
monthly / term / student / class) are new categories, each with PDF/Excel/CSV
export via a shared generator (`src/lib/export/table-export.ts`). The
existing Finance and Academic Performance reports are unchanged and just
relinked from the hub page.

**Student ID cards** (`/admin/students/id-cards`) — pick a class, select
students, generate a PDF with several CR80-sized cards per A4 page (logo,
photo, name, ID, class, year). Gated to `STUDENT_EXPORT_ROLES` (Proprietor/
Headteacher), same PII boundary as the existing student export.

**Website / content management** (`/admin/website`) — replaced the "Coming
Soon" stub with real CRUD for Announcements, Events, and Gallery images.
Public content (about/vision/mission/contact/admission info) already existed
under `/admin/settings`; the hub just links to it rather than duplicating it.
Fixed the public gallery page along the way — it built an image grid but
never actually rendered `imageUrl`. Announcements gained a `category` field
and an `isPrivate` flag (private = shown in portals/dashboard, never on the
public site); the public news pages now filter it out.

**Notifications** — new `Notification` model, `src/lib/notifications.ts`
(notify a user / users / role / a student's guardians — all best-effort, so a
failed notification insert never breaks the action that triggered it), a
bell dropdown in the admin topbar and parent portal header, and two wired
triggers: a new admission payment submission notifies
Proprietor/Headteacher/Admissions Officer, and a "Notify Guardian" button on
the report-card page lets staff tell a parent their child's report card is
ready. There's no automatic "results published" event (results are entered
per-assessment, not published as a batch) or scheduled deadline reminders —
building a real scheduling/cron layer felt like more architecture than this
phase should introduce; the manual trigger covers the spec's example without
spamming guardians on every score entry.

**Parent Portal** (`/parent`) — genuinely new. A `Guardian` model links a
PARENT-role `User` to one or more `Student`s; every parent-portal page and
API re-checks that link (via `requireGuardianAccessToStudent`) before
touching a student's data, the same "recheck every time" posture the admin
side already uses for module access. An admin links (or creates) a parent
account from the student's profile page (`GuardianAccessManager`). The portal
itself shows each linked child's profile, attendance summary, recent results,
fees/payments/outstanding balance, and school announcements. Login now
detects a guardian-only account and sends it to `/parent` instead of
`/admin`; `proxy.ts` guards `/parent/*` the same way it guards `/admin/*`
(auth only — resource-level scoping is enforced server-side, not in the
proxy, matching the existing doc comment there).

**Teacher Portal** — mostly already existed: `TEACHER` already had scoped
read/write access to Students/Academics/Attendance and no access to
Fees/Finance/Payroll (verified this against `rbac.ts` before building
anything new — the spec's restriction was already enforced). What was
missing was a teacher-oriented landing view, so the dashboard now branches:
a teacher without unrestricted-academics access sees a "My Classes" card
(reusing the existing `getTeacherAttendanceClassIds` scoping) with quick
links to attendance/results/report cards, instead of the financial overview.

**Dashboard** (`/admin`) — now shows Students, Staff, Admissions, Attendance
marked today, and (for roles with finance/fee access) Fees Expected/
Collected/Outstanding, Revenue, Expenses, Salaries, and Net Operating
Balance — reusing the existing `getFinanceSummary()` rather than
reimplementing those aggregates. Plus Recent Payments, Recent Admissions, and
a Pending Actions list. Every section is gated by the viewer's actual module
access, so e.g. a Teacher never sees the finance panel.

**Search** (`/admin/search`, `/api/admin/search`) — a search box in the admin
topbar and a results page across Students, Staff, and Applications, each
section gated by the same module-read check as the corresponding admin
pages. Payments/Reports search wasn't finished — see below.

## What I did not get to / deliberately scoped down

- **No automated "results published" or "deadline approaching" events.**
  Both would need a real scheduling layer (a term-level "publish" action, a
  cron/queue for deadline reminders) that doesn't exist anywhere else in the
  codebase yet. The manual "Notify Guardian" button covers the report-card
  case from the spec.
- **No image upload/optimization for the Gallery.** The codebase's existing
  convention for images (`StudentDocument`, `photoUrl`, `logoUrl`) is an
  external URL, not a file upload pipeline — there's no storage/CDN wired up
  anywhere in Phases 1–4. I followed the same convention rather than
  introducing new infrastructure; the gallery form asks for an
  already-hosted, already-optimized image URL and says so.
- **Search doesn't cover Payments or Reports yet** — Students/Staff/
  Applications are wired; Payments (by reference/student) and a
  reports-by-name search would be quick follow-ons using the same pattern.
- **Mobile pass:** I used the same responsive Tailwind classes as the rest of
  the admin UI, but I didn't get a real device/viewport pass in on the new
  screens (ID card picker, report filter panels, parent portal). Worth
  checking on an actual Android browser before calling this "done" per the
  spec's mobile requirement.
- **No new automated tests beyond `slug.test.ts`.** Most of what I built is
  either UI (existing convention here is no component tests) or Prisma-backed
  routes (the existing integration tests skip without a live DB, and I don't
  have one in this environment) — I leaned on ESLint + the full existing
  suite (230/230 green) rather than fabricate tests I couldn't actually run
  against a database.

## New Prisma models/fields (need `db:push` or a migration)

- `Notification` (new model)
- `Guardian` (new model — the parent portal's security boundary)
- `Announcement.category` (String, default "General"), `Announcement.isPrivate` (Boolean, default false)
- `GalleryImage.isPublished` (Boolean, default true)

## A parent account, end to end

1. On a student's profile page, admin/headteacher uses **Parent Portal
   Access** to link an existing account by email, or create one with a
   temporary password.
2. The parent signs in at `/login` with that email/password and lands on
   `/parent` (not `/admin`).
3. They see their linked children, tap into one, and see that child's
   profile/attendance/results/fees — nothing else.

---

## Review round 2 — fixes applied

All seven items from the review were addressed (items 1–6; item 7 was a
do-not-do list and was respected). Vitest stayed green throughout — 237
tests passing (230 before this round + 7 new), full ESLint clean. Summary
per file:

**1. CSV import year-orphan bug**
- `src/lib/students.ts` — added `matchImportClassName(className, classes)`, a
  pure helper returning `{ classId, academicYearId }` together (or
  `undefined`), plus unit tests in `src/lib/__tests__/students.test.ts`.
- `src/app/api/admin/students/import/route.ts` — classes are now loaded
  scoped to `academicYear.findFirst({ isCurrent: true })` only (422 if none
  exists); row validation and student creation both use the new helper, so
  `classId` and `academicYearId` are always set together and never
  cross-year.

**2. Parent portal / public announcement `isPrivate` consistency**
- `src/app/(site)/page.tsx` — homepage announcement query now filters
  `isPrivate: false` (was missing it); also added the `isPublished: true`
  filter to the homepage's gallery preview, which had none.
- `src/app/sitemap.ts` — announcement query now filters `isPrivate: false`.
- `src/app/parent/page.tsx` — confirmed already correct as flagged in the
  review (published, no `isPrivate` filter) — no change needed there.
- `src/app/(site)/news/page.tsx`, `src/app/(site)/news/[slug]/page.tsx` —
  confirmed already correct (`isPublished: true, isPrivate: false`) from the
  first Phase 5 pass — no change needed.
- `src/app/parent/layout.tsx` — a signed-in user with zero `Guardian` rows
  who isn't a PARENT-only account is now redirected to `/admin`; a staff
  member who is also linked as a guardian keeps access.

**3. Enrollment TOCTOU**
- `src/app/api/admin/applications/[id]/enroll/route.ts` — rewritten so the
  target class is row-locked (`SELECT ... FOR UPDATE`) inside the
  transaction, then the application is re-loaded, eligibility re-checked,
  "not already enrolled" re-confirmed, the class's academic year
  cross-checked against the request, and occupancy re-counted under the
  lock — all before the admission number is generated. A new
  `EnrollmentConflictError` carries the right status/message out of the
  transaction.

**4. Promotion confirm capacity/state check**
- `src/lib/academics/promotion.ts` — added `hasRemainingCapacity({ capacity,
  currentCount, incomingCount })`, unit tested in
  `src/lib/academics/__tests__/promotion.test.ts`.
- `src/app/api/admin/promotions/[id]/confirm/route.ts` — inside the existing
  transaction, records are processed in a stable (createdAt) order; every
  student is re-checked to still be ACTIVE in the batch's `fromClass`; every
  destination class is checked to exist, belong to `toAcademicYearId`, and
  have room for its own occupancy plus every other record in the batch
  headed there. Any single violation throws before any `student.update`
  runs, so Prisma rolls back the whole transaction and the batch stays
  DRAFT.

**5. Settings RBAC mismatch**
- `src/app/api/settings/route.ts` — `requireRole("PROPRIETOR")` replaced
  with `requireModuleAccess("settings", "read"/"write")`, matching
  `src/lib/rbac.ts` and the settings page (which already used the module
  check). SUPER_ADMIN can now reach it; nothing else changed.

**6. Teacher scoping audit — two real leaks found and fixed**
- `src/app/admin/students/page.tsx` — called `listStudents()` directly
  without the `restrictToClassIds` the API route
  (`/api/admin/students`) already applied. A Teacher visiting this page
  saw the whole-school roster. Fixed using the same
  `needsTeacherScoping`/`getTeacherClassIds` pattern as the API route;
  also scoped the class-filter dropdown to the teacher's own classes.
- `src/app/admin/search/page.tsx` and `src/app/api/admin/search/route.ts`
  (both from the first Phase 5 pass) — the students section was gated
  only by `students:read` (which Teacher holds) with no class
  restriction. Fixed the same way.
- `src/app/api/admin/reports/academic-performance/route.ts` — gated only
  by `academics:read` (Teacher holds this too), and returned every
  class-subject's average school-wide with no restriction to the
  classes/subjects a Teacher is actually assigned to teach — the same gap
  `/api/admin/assessments` already guards against with
  `getTeacherClassSubjectIds`. Fixed by intersecting the query with the
  teacher's own class-subject ids when the caller isn't unrestricted.
- Everything else grepped (`prisma.student.findMany`/`.count` across
  `src/app/api/admin` and `src/app/admin`) was already correctly scoped:
  attendance routes (`requireAttendanceAccessForClass`), assessment/results
  routes (`requireResultsAccessForClassSubject` / per-classSubject
  filtering), report-cards and assessment detail pages
  (`isUnrestrictedAcademics` + `getTeacherAttendanceClassIds`/
  `getTeacherClassSubjectIds`), and everything gated at a level Teacher
  doesn't hold (fees, finance, admissions write, students write,
  `STUDENT_EXPORT_ROLES`, `reports` read). No new RBAC concepts were
  introduced — every fix reuses an existing helper from
  `src/lib/data/students.ts` or `src/lib/academics/authorize.ts`.

## Backfill for existing year-orphan rows (item 1)

Not run — this only fixes the code path going forward. Any `Student` rows
already created via CSV import before this fix (with `classId` set and
`academicYearId` null) can be backfilled with:

```sql
UPDATE "Student" s SET "academicYearId" = c."academicYearId"
FROM "Class" c WHERE s."classId" = c.id AND s."academicYearId" IS NULL;
```
