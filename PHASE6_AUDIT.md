# Phase 6 — Audit Notes (Round 1: static audit, no live DB)

## Environment constraint (read this first)

This pass ran in a sandbox whose network allowlist doesn't include
`binaries.prisma.sh`, which Prisma 7's CLI needs to download its query
engine — `prisma generate` fails with a 403 before it ever touches a
database. That means, from this sandbox, I could not:

- generate the Prisma client (so `tsc` reports ~70 errors that are **not**
  real bugs — they're `Property 'x' does not exist on type '{}'` /
  `implicit any` cascades from every Prisma-typed value resolving to `{}`.
  Run `npm run db:generate` and re-run `npx tsc --noEmit`; the great
  majority of these will disappear on their own)
- run a live Postgres, so the two DB-integration test files self-skip by
  design, `next build` can't be verified end-to-end, and no migration was
  applied or tested
- exercise the actual admission → payment → enrollment → fees → payroll
  flow against real data

**Before you deploy, run these yourself** (needs real network/DB access):

```bash
npm run db:generate
npm run db:push        # or db:migrate, on a real Postgres instance
npm run build           # full type-check + production build
npm test                 # should stay 237/237 + the 2 previously-skipped
                           # integration files should now actually run
```

Everything below is what I *could* verify without a DB: `npm install`,
ESLint, the full Vitest unit suite (237/237 green, unchanged), and a
line-by-line read of every finance/auth/admissions module and every API
route's permission guard.

## Headline finding: the existing codebase is solid

Phases 1–5 are not a rough draft. Every finance mutation I traced
(payment reversal, payroll PAID transition, fee assignment) is guarded by
a DB-level unique constraint specifically to survive a double-submit race,
not just an application-level check — e.g. `Expense.payrollPeriodId` and
`PaymentReversal.paymentId` are both `@unique`, so even a check-then-act
race can't double-book. The admissions and student-status state machines
(`src/lib/admissions.ts`, `src/lib/students.ts`) are closed, explicit
transition tables — no state can skip a step. Every one of the 100+ admin
API routes calls a `requireModuleAccess`/`requireRole`/
`requireGuardianAccessToStudent`-family guard before touching data (I
scripted a scan across every `route.ts`; the only files with no direct
call were ones that delegate to a differently-named wrapper, e.g.
`requireAttendanceAccessForClass` — verified by hand, not a gap).

I did not find any TODO/FIXME/mock/dummy/"not implemented" standing in
for required functionality — the one "coming soon" state (public Gallery
with zero published images) is a legitimate empty state, not a stub.

## Fixes applied this pass (no DB required, safe to ship)

1. **`next.config.ts`** — added `Strict-Transport-Security` and
   `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Neither
   was set before; this app uses none of those APIs, so denying them
   outright removes an unnecessary permission surface. HSTS is inert on
   the http responses you'll see in local dev and takes effect the moment
   you're actually served over https.
2. **`src/app/robots.ts`** — `/parent` (the parent portal) was missing
   from `disallow`, alongside `/admin`, `/login`, `/api`. It's
   auth-gated either way, but there's no reason to let it show up in a
   sitemap crawl or search index.
3. **`src/components/admin/student-status-changer.tsx`** — the
   `currentStatus` prop was typed as a bare `string` instead of the
   `StudentStatus` union, which both weakened the type and was the actual
   cause of a real `tsc` error (independent of the missing Prisma client)
   on the `setStatus` call. Tightened the prop type and the `onChange`
   cast to match; behavior is unchanged, the type is now honest.
4. **`src/components/admin/finance-charts.tsx`** — the Recharts
   `Tooltip formatter` callbacks were typed for a plain `number`, but
   Recharts' actual `ValueType` can be a string or an array (stacked
   series). This is a genuine type error that would fail `next build`
   regardless of the Prisma issue — replaced with a shared `ghsTooltip`
   helper that coerces defensively instead of assuming the shape.

Re-ran ESLint + Vitest after each change: still 0 lint errors, still
237/237 tests passing.

## Worth your attention before go-live (not code bugs — deployment/topology)

- **`getClientIp()` in `src/lib/public-guard.ts`** trusts the first hop of
  `x-forwarded-for` verbatim. That's correct *only* if whatever sits in
  front of the app (a real reverse proxy / your host's edge network)
  overwrites client-supplied `X-Forwarded-For` rather than appending to
  it. If you self-host behind a bare Nginx config that doesn't strip
  inbound `X-Forwarded-For`, a requester can spoof it to get a fresh rate
  limit bucket on every request. Worth a one-line confirmation in
  whichever free-tier host you land on (see deployment doc, next pass).
- The Prisma-engine network block I hit here will also block whoever
  builds/deploys this from an environment with the same restriction —
  it's specific to this sandbox, not a project bug, but flagging it in
  case your CI or hosting sandbox has a similar allowlist.

## What's next

Per your steer, this pass stayed in "static audit + fix what's provable
without a DB" mode. The remaining Phase 6 scope — running migrations
against a real Postgres, the full business-flow walkthroughs, financial
totals verified against seeded data, permission testing via actual HTTP
requests per role, and the free-tier deployment writeup — all need a real
DB connection. Once you've run `db:generate`/`db:push` on your machine or
CI, the fastest next step is re-running `npm test` and `npx tsc --noEmit`
and sending me whatever's still red — at that point I can fix against
real error output instead of guessing at what the generated client will
look like.
