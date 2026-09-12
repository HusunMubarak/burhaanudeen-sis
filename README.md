# Burhaanudeen Islamic School — Management & Information System

**Phase 1 — Foundation, Public Website & Authentication**
**Phase 2 — Students, Staff, Classes & Complete Admissions**
**Phase 2 Hardening — Security, Authorization & PostgreSQL**

A School Management and Information System for Burhaanudeen Islamic School
(Sang, Mion District, Ghana), covering Creche, Primary and JHS.

**Implemented so far:** the public marketing website, secure role-based
authentication (with fresh-per-request role/active-status checks — see
"Security Notes"), an admin dashboard, configurable school settings, the
full database schema on PostgreSQL, complete Student and Staff management
(search, filter, 360° profiles, CSV import/export, PDF list export),
Class/Academic Year/Term management, an audit log viewer, and the full
online admissions pipeline — application → manual MoMo payment claim →
admin verification → review → accept/reject/interview/withdraw → PDF
admission letter → one-click enrollment that creates the student record
automatically.

Attendance, Fees, Finance, Payroll and Reports are **intentionally not
implemented yet** — their navigation and permissions exist, showing a clean
"coming soon" state, ready for a later phase to fill in.

This hardening pass added: role/access re-checked from the database on
every request (not just at login), a server-side policy on which roles a
staff account can grant, rate limiting and a honeypot on every public form,
identity verification on the public payment/status/withdraw endpoints,
https-only validation on every stored link, security headers, PostgreSQL
as the default database with real Prisma migrations, and removal of the
`xlsx` package (known CVEs) in favor of `exceljs` and hand-rolled CSV. See
"Security Notes" below for the full list and the reasoning behind each.

---

## Technology Stack

| Layer          | Choice                                                        |
|----------------|-----------------------------------------------------------------|
| Framework      | Next.js 16 (App Router, TypeScript, React 19)                  |
| Styling        | Tailwind CSS v4, custom design tokens (no default template look)|
| Database ORM   | Prisma ORM                                                      |
| Database       | PostgreSQL (default — Docker Compose provided; SQLite optional for local dev, see below) |
| Auth           | NextAuth (Auth.js) v5, Credentials provider, bcrypt password hashing, JWT sessions |
| Validation     | Zod                                                              |
| Testing        | Vitest + Testing Library                                        |
| Icons          | lucide-react                                                     |

This is a single full-stack Next.js application (API routes + server
components + client components in one codebase) — chosen for RAD speed: one
language, one deploy target, fast iteration, and Prisma's typed models keep
the many entities (School, User, Role, Student, Staff, Class, Term, …) easy
to extend safely in later phases.

---

## Project Structure

```
src/
  app/
    (site)/            Public website (home, about, academics, admissions,
                        news, events, gallery, contact) — shares a header/footer layout
    admin/              Authenticated dashboard shell (sidebar + topbar),
                        one folder per module, guarded by role
    api/
      auth/[...nextauth] NextAuth route handlers
      contact/           Public contact form submission endpoint
      settings/          School settings GET/PATCH (Proprietor-only)
    login/               Staff login page
    layout.tsx           Root layout (fonts, toaster, base metadata)
    sitemap.ts, robots.ts SEO files
  components/
    site/                Public site components (header, footer, forms)
    admin/                Admin shell components (sidebar, topbar, settings form)
    ui/                   Shared primitives (Button, Card, form fields, states)
  lib/
    auth.ts               NextAuth configuration
    authorize.ts           Server-side permission checks (the real security boundary)
    rbac.ts                 Role/module access matrix (edge-safe, no DB import)
    prisma.ts                Prisma client singleton
    validation.ts             Zod schemas shared by forms and API routes
    data/settings.ts           School settings data-access helpers
  proxy.ts                Route-level redirect guard for /admin/* (Next.js 16's "proxy" convention, formerly middleware.ts)
prisma/
  schema.prisma            Database schema
  seed.ts                   Seeds roles, dev users, sample content
prisma.config.ts           Prisma 7 CLI config (connection URL, migrations, seed command)
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

> This step downloads Prisma's schema-engine binary (used by `generate`
> `migrate`/`db push`/`studio`) from Prisma's CDN. It needs normal
> internet access — if you're behind a restrictive corporate proxy or a
> locked-down CI/sandbox image and a `prisma` command fails with a
> checksum/403 error, allow outbound access to `binaries.prisma.sh`, or
> run `npm install` once on an unrestricted machine/network.
>
> **Prisma 7 note:** connection config now lives in `prisma.config.ts`
> (not `schema.prisma`), and `PrismaClient` must be constructed with an
> explicit driver adapter — see `src/lib/prisma.ts`. This project ships
> pre-wired for PostgreSQL via `@prisma/adapter-pg`. See "Switching back
> to SQLite for local dev" below if you want a zero-Docker option.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env` — at minimum, generate a real `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

See [Environment Variables](#environment-variables) below for what each
value does.

### 3. Start PostgreSQL and set up the database

```bash
docker compose up -d   # starts local Postgres (see docker-compose.yml)
npm run db:generate    # generate the Prisma client
npm run db:migrate     # create and apply the initial migration
npm run db:seed        # seed roles, sample content, and dev accounts
```

The first `npm run db:migrate` run generates `prisma/migrations/` from
`prisma/schema.prisma` against your empty database — commit that folder
once it's created so future changes are tracked as real migrations, not
just `db push`.

### 4. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000` for the public website, and
`http://localhost:3000/login` to sign in to the dashboard.

---

## Default / Development Admin Setup

`npm run db:seed` creates one user per role, all with the password
`ChangeMe123!` (also printed to the console when you run the seed script).

| Role                 | Email                          |
|-----------------------|--------------------------------|
| Super Administrator   | superadmin@burhaanudeen.test   |
| Proprietor            | proprietor@burhaanudeen.test   |
| Headteacher           | headteacher@burhaanudeen.test  |
| Admissions Officer    | admissions@burhaanudeen.test   |
| Bursar / Accountant   | bursar@burhaanudeen.test       |
| Teacher               | teacher@burhaanudeen.test      |

**These are development-only accounts.** Change or remove them — and set a
new `AUTH_SECRET` — before any real deployment.

There is no self-serve sign-up: staff accounts are provisioned directly in
the database (via seed data now, and via an admin-facing "Staff" module in
a later phase). The **Parent** role exists in the schema and permission
matrix as a future-ready placeholder — it has no admin dashboard access yet.

---

## Environment Variables

| Variable        | Description                                                          |
|-------------------|--------------------------------------------------------------------|
| `DATABASE_URL`   | Prisma connection string. Defaults to a local Postgres (`postgresql://burhaanudeen:burhaanudeen@localhost:5432/burhaanudeen_sis`, matching `docker-compose.yml`). |
| `AUTH_SECRET`    | Secret used to sign session JWTs. Generate with `openssl rand -base64 32`. |
| `NEXTAUTH_URL`   | The app's base URL (used for auth callbacks, sitemap, robots.txt).   |

---

## Database Setup

### PostgreSQL (default)

`docker compose up -d` starts a local Postgres matching the
`DATABASE_URL` in `.env.example`, or point `DATABASE_URL` at any
Postgres instance (a free tier on Neon/Supabase works fine — no paid
service required). Then `npm run db:generate && npm run db:migrate &&
npm run db:seed`.

### Switching back to SQLite for local dev

Not recommended once you have real data (Postgres-specific constraints
like the `(academicYearId, name)` unique index on classes still apply,
and SQLite's `contains` filters are case-sensitive where Postgres's
aren't — see `src/lib/data/students.ts`), but fine for a quick
zero-Docker spike:

1. Install a SQLite driver adapter and remove the Postgres one:
   ```bash
   npm install @prisma/adapter-libsql
   npm uninstall @prisma/adapter-pg pg
   ```
2. In `prisma/schema.prisma`, change the datasource provider to `"sqlite"`.
3. In `src/lib/prisma.ts` and `prisma/seed.ts`, swap the adapter:
   ```ts
   import { PrismaLibSql } from "@prisma/adapter-libsql";
   const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
   ```
4. Set `DATABASE_URL="file:./dev.db"` in `.env`.
5. Update `serverExternalPackages` in `next.config.ts` (`@prisma/adapter-libsql` instead of `@prisma/adapter-pg`/`pg`).
6. `npm run db:generate && npm run db:push`

---

## Development Commands

| Command              | Purpose                                        |
|------------------------|--------------------------------------------|
| `npm run dev`          | Start the dev server                            |
| `npm run build`        | Production build                                |
| `npm run start`        | Run the production build                        |
| `npm run lint`         | ESLint                                          |
| `npm run db:generate`  | Generate the Prisma client                      |
| `npm run db:push`      | Push schema changes to the dev database (no migration history) |
| `npm run db:migrate`   | Create/apply a versioned migration              |
| `npm run db:seed`      | Seed roles, dev accounts, sample content        |
| `npm run db:studio`    | Open Prisma Studio (visual DB browser)          |

## Test Commands

| Command                | Purpose                                     |
|---------------------------|-----------------------------------------|
| `npm test`                | Run the full test suite once              |
| `npm run test:watch`      | Run tests in watch mode                   |

The suite covers (123 tests total):
- **RBAC** (`rbac.test.ts`) — the role → module access matrix, read vs write levels
- **Hardening review** (`hardening.test.ts`) — the staff role-grant policy, Teacher
  module boundaries, phone number normalization/matching, payment amount
  matching, duplicate-application detection, and application-status
  transition gating — one test per finding in the security review that
  produced this pass
- **Admissions state machine** (`admissions.test.ts`) — `canTransitionApplication`,
  `canTransitionPayment`, `canEnroll`, the public status label
- **Student state machine** (`students.test.ts`) — `canTransitionStudent`,
  including the illegal jumps named in the hardening review
  (GRADUATED → APPLICANT, ACTIVE → APPLICANT)
- **Validation** (`validation.test.ts`, `phase2-validation.test.ts`) — every
  Zod schema: contact form, school settings, login, applications, payment
  claims, students, staff, classes, academic years, terms
- **ID formatting** (`id-format.test.ts`) — the sequential BIS-YYYY-NNNNN generator
- **Password hashing** (`password.test.ts`) — bcrypt hash/verify behavior used by auth
- **Database foundation** (`db.integration.test.ts`) — roles, users, permissions,
  school settings persistence, and core relationships (AcademicYear → Term → Class)

The integration test file requires a generated Prisma client and a pushed
schema (`npm run db:generate && npm run db:push`, or a live `DATABASE_URL`);
if that hasn't been done, it detects that and skips with a clear message
instead of failing the whole suite — the same pattern to follow for any
future integration test that needs a real Postgres connection.

---

## Troubleshooting

**`npm install` fails building a native module (e.g. `node-gyp`/Visual
Studio errors)** — `pg` and `@prisma/adapter-pg` are pure-JS/prebuilt and
shouldn't need a compiler. If you've modified the project to add a
different native database driver and hit a build error, either install
the [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
("Desktop development with C++" workload) or switch to an adapter with
prebuilt binaries (`@prisma/adapter-libsql`, used by the SQLite fallback
path above, is one such option).

**`npm install` prints an `EPERM`/cleanup warning on Windows** — this
is npm failing to delete a leftover temp folder from a previous
partial install, not a real failure (check the summary line above it —
if it says `added N packages`, the install succeeded). Safe to ignore;
if packages seem missing, delete `node_modules` and reinstall.

**A `prisma` command fails with a schema-engine 403/checksum error** —
your network is blocking `binaries.prisma.sh`. See the note under
"1. Install dependencies" above.

---

## Security Notes

**Authentication & authorization**
- Passwords are hashed with bcrypt (cost factor 12); staff passwords require
  10+ characters with at least one letter and one number.
- **Authorization happens on the server, not just in the UI.** `src/proxy.ts`
  redirects unauthenticated/under-privileged users away from `/admin/*`
  pages as a UX convenience, but every API route and page independently
  calls `requireRole()` / `requireModuleAccess(module, "read" | "write")`
  from `src/lib/authorize.ts` before touching data — hiding a sidebar link
  or a button is never treated as access control.
- **Roles and active status are re-read from the database on every request**,
  not cached in the session JWT — a role change or a staff member being
  deactivated takes effect on their very next request, not their next
  login. A staff member whose `Staff.status` isn't `ACTIVE` (resigned,
  terminated, retired, inactive) is locked out even if their underlying
  `User.isActive` was never separately toggled — the two are kept in sync
  in the same transaction wherever staff status changes.
- **Staff role grants are policy-checked server-side**, not just hidden in
  the UI: nobody can grant `SUPER_ADMIN` unless they already hold it, and
  otherwise a caller can only grant roles they themselves hold (see
  `canGrantRoles` in `src/lib/rbac.ts`). A Headteacher creating a new staff
  account cannot make that account a Proprietor by editing the request.
- Every students/staff/academics/admissions module distinguishes **read vs
  write** access per role (`src/lib/rbac.ts`'s `MODULE_ACCESS`), and
  Teachers are further scoped at the query level to only the classes where
  they're the assigned class teacher (`getTeacherClassIds` in
  `src/lib/data/students.ts`) — a teacher with no assigned classes sees an
  empty list, never the whole school.
- Student roster **export** (CSV/XLSX/PDF) requires Proprietor or
  Headteacher specifically — narrower than ordinary student read/write
  access — and every export is written to the audit log.

**Public endpoints**
- Every public POST endpoint (apply, payment claim, status check,
  withdraw, contact form, login) is **rate-limited** by IP via a Postgres-
  backed fixed-window limiter (`src/lib/public-guard.ts` — no Redis, per
  the free-stack requirement). The apply/payment/contact forms also carry
  a hidden **honeypot field**; a bot that fills it gets a fake success
  response without anything being written.
- The payment-claim and status-check endpoints require the **application
  number and the guardian phone on file to match**, and return the
  identical generic error whether the application number doesn't exist or
  the phone is wrong — application numbers can't be enumerated by
  comparing error responses.
- A payment claim's amount must match the configured admission form fee
  (±0.01), and `PaymentClaim.reference` is globally unique — a reused MoMo
  transaction reference is rejected rather than silently overwriting a
  prior claim.
- Duplicate applications for the same child (matched on normalized
  guardian phone + name + date of birth, excluding already-closed
  applications) are rejected before a second application number is ever
  generated.

**Data handling**
- Input is validated server-side with Zod on every API route, independent
  of client-side form validation.
- Every URL a user can submit — document links, payment screenshots,
  photos, the school logo, social/website links — is restricted to
  `http(s)://` only (`optionalHttpsUrlSchema`/`nullableHttpsUrlSchema` in
  `src/lib/validation.ts`); `javascript:`, `data:` and `file:` are
  rejected outright. There is no file upload service yet — these are all
  external links (e.g. Google Drive) pending real storage in a later
  phase (`TODO(phase5)`).
- CSV import is capped at 2 MB / 500 rows, re-validates every row
  server-side regardless of what the client showed in preview, runs as a
  single transaction (a failure partway through never leaves a
  half-imported roster), and rejects rows naming a class that doesn't
  exist or matching an existing student (same name + DOB + guardian
  phone) rather than silently creating a duplicate or an unassigned
  student.
- Student and Application status changes go through documented state
  machines (`src/lib/students.ts`, `src/lib/admissions.ts`) — illegal
  jumps (e.g. a graduated student becoming an applicant again, an
  application skipping straight from submitted to accepted) are rejected
  server-side regardless of what the client requests. Historical records
  are never deleted, only status-changed, with every change appended to
  a status history table.
- Security headers are set on every response (`next.config.ts`):
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a
  Content-Security-Policy scoped to what this app actually needs (Google
  Fonts, the Google Maps embed on the contact page) rather than a generic
  policy that would silently break something.
- Secrets live in `.env` (gitignored) — `.env.example` documents required
  variables without real values. The seed script refuses to run when
  `NODE_ENV=production`, since it creates well-known development
  credentials.
- `/admin`, `/login` and `/api` are excluded from search indexing via `robots.ts`.
- All significant actions are recorded to `AuditLog` and viewable at
  `/admin/audit-logs` (Proprietor/Super Admin only): payment verification,
  admission decisions, enrollment, student/staff changes, exports, and
  public withdrawals.

---

## What's Next (Later Phases)

Phase 2 completed the full admissions workflow, Student/Staff/Class/Academic
Year/Term management, and a security/authorization hardening pass.
Explicitly out of scope so far, per the project brief: attendance, fees,
payroll, results/report cards, a real file/photo upload service, and any
paid third-party service (email/SMS providers, hosted Redis, error
tracking, etc — see "Security Notes" for what's used instead). The
dashboard navigation, permission matrix and page shells for these already
exist under `src/app/admin/*` — each currently renders a "coming in the
next module" state and is ready for real functionality to be added without
touching auth, layout or navigation.
