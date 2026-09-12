# Deployment & Local SEO Runbook (Free Tier)

Stack fit: this is a Next.js 16 app (frontend + API routes together) on
Postgres via Prisma 7's `pg` driver adapter — no separate backend, no
local file storage (gallery/staff photos are stored as URLs, not
uploaded binaries). That maps cleanly onto **Vercel** (hosting) +
**Neon** (serverless Postgres), both of which have real free tiers with
no credit card trickery, and both give you automatic HTTPS for free —
no separate SSL step needed.

If a custom domain isn't available yet, everything below still works on
the free `*.vercel.app` URL Vercel gives you — just use that URL
everywhere `NEXTAUTH_URL` is asked for, and add the real domain later
(step 8) without redeploying from scratch.

---

## 1. Push the code to GitHub

Vercel deploys from a Git repo.

```bash
cd burhaanudeen-sis          # this project, after unzipping
git init
git add .
git commit -m "Phase 6: production-ready"
```

Create an empty repo on github.com (free, private is fine), then:

```bash
git remote add origin https://github.com/<you>/burhaanudeen-sis.git
git branch -M main
git push -u origin main
```

## 2. Create the free Postgres database (Neon)

1. Go to neon.tech → sign up free → **New Project**.
2. Name it (e.g. `burhaanudeen-sis`), pick a region close to Ghana (EU
   regions are usually the lowest-latency free option).
3. On the project dashboard, copy the **pooled** connection string (it's
   labeled "Pooled connection" — this matters: Vercel runs your API
   routes as separate serverless invocations, and the pooled endpoint is
   built for exactly that; the direct connection string will exhaust
   under real traffic). It looks like:
   `postgresql://user:pass@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require`

Keep this tab open — you'll need this string twice (once locally to
seed the DB, once in Vercel's env vars).

## 3. Apply the schema and seed initial data (run this once, locally)

On your own machine (not this sandbox — it needs real network access to
`binaries.prisma.sh` for the Prisma engine):

```bash
npm install
echo 'DATABASE_URL="<paste the Neon pooled string>"' > .env
echo 'AUTH_SECRET="'$(openssl rand -base64 32)'"' >> .env
echo 'NEXTAUTH_URL="https://your-project.vercel.app"' >> .env   # update after step 5 if you don't know it yet

npm run db:generate
npm run db:push          # creates every table from prisma/schema.prisma
npm run db:seed          # roles + one login per role, demo password
npm test                  # should now be 237/237 AND the 2 DB-integration
                            # test files should actually run, not skip
npm run build             # full production build — catches anything
                            # this sandbox's missing Prisma client hid
```

**Change the seeded demo passwords before anyone else can reach the
site** — `prisma/seed.ts` creates `superadmin@burhaanudeen.test` and
one account per role, all sharing one development password. Log in as
`superadmin@...`, change your own password, and either change or
deactivate the other seeded accounts once you've created real staff
logins for them. Never leave `.test` demo accounts reachable in
production.

## 4. Push your real content into Settings before going live

The homepage's structured data (what tells Google "this is a school
located here") reads live from the database, not from hardcoded text —
so before you announce the site:

- Log in as an admin → **Settings** → fill in the real **address, town,
  phone, email**, and upload/set a **logo URL**. This feeds both the
  visible Contact page and the SEO structured data added in this pass.
- Add at least a few **Gallery** images and one **Announcement** — an
  empty site reads as inactive/abandoned to both visitors and Google.

## 5. Deploy to Vercel

1. vercel.com → sign up free → **Add New Project** → import the GitHub
   repo from step 1.
2. Framework preset: Vercel auto-detects Next.js — leave defaults.
3. Before the first deploy, add **Environment Variables**:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the same Neon pooled string from step 2 |
   | `AUTH_SECRET` | the same value you generated in step 3 |
   | `NEXTAUTH_URL` | `https://<your-project>.vercel.app` (Vercel shows you this name before you deploy — or set it after the first deploy and redeploy once) |
4. Deploy. Vercel builds with `next build` and serves it over HTTPS
   automatically — no separate SSL/HTTPS step, no separate backend to
   stand up.
5. If you set `NEXTAUTH_URL` before knowing the final URL, go to
   **Project Settings → Environment Variables**, correct it, then
   **Deployments → Redeploy** — the sitemap, robots.txt, structured
   data and metadata all read this value, so it has to match exactly.

## 6. Production settings sanity check

Already handled in code, nothing to toggle manually:
- `NODE_ENV=production` is set automatically by Vercel — this already
  drops Prisma's verbose query logging (`src/lib/prisma.ts`) and is what
  the "DEBUG=false" requirement maps to for a Next.js app (there's no
  separate Django-style `DEBUG` flag here).
- Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) are
  set in `next.config.ts` and apply to every response automatically.
- CORS: there is no cross-origin API here (the frontend and API share
  one origin), so there's nothing to configure — don't add permissive
  CORS headers to the API routes; that would only widen the attack
  surface for no benefit.

One thing to *verify with Vercel's current docs* rather than take on
faith: confirm Vercel's edge network overwrites `X-Forwarded-For`
rather than passing through whatever the client sent — this app's rate
limiter (`src/lib/public-guard.ts`) trusts that header, and it's the one
piece of this stack whose correctness depends on the hosting platform
rather than the code.

## 7. Backups (do this on a schedule, not once)

- **Database**: Neon's free tier includes automatic point-in-time
  restore for a limited window (check current retention in the Neon
  dashboard — free-tier limits change). For anything beyond that
  window, run a manual export periodically:
  ```bash
  pg_dump "<Neon pooled connection string>" -F c -f backup-$(date +%F).dump
  ```
  Store that file somewhere outside Neon (Google Drive, a second free
  storage bucket) — a backup living in the same place as the thing it
  backs up isn't a backup.
- **Students / Financial / Results / Attendance / Admissions**: the app
  already has Excel/CSV export built into each of those admin modules —
  run those exports on whatever cadence the school wants (e.g. monthly)
  as a human-readable backup independent of the database dump above.

## 8. Custom domain (optional, whenever the school gets one)

Vercel → Project → **Settings → Domains** → add the domain → Vercel
gives you a DNS record to add at the registrar. Once it's verified,
update `NEXTAUTH_URL` to the new domain and redeploy (step 5.5) — this
one variable drives the sitemap, canonical URLs, and structured data, so
it's the only thing that needs updating. Until then, the `vercel.app`
URL is a completely valid, fully HTTPS, fully indexable address — Google
does not penalize a site for being on a subdomain of a hosting provider.

---

## 9. Getting found when people search for a school in Mion

Deploying the site doesn't make it appear in search — that needs a
separate, deliberate step: telling Google (and Bing) it exists, and
giving it the local signals to associate with "Mion".

1. **Google Search Console** (free): search.google.com/search-console
   → **Add Property** → enter your production URL.
   - Verify ownership the easy way for a Vercel site: choose "HTML tag"
     verification, copy just the `content="..."` value from the meta tag
     Google gives you, add it to Vercel as an env var named
     `GOOGLE_SITE_VERIFICATION`, redeploy, then click Verify in Search
     Console (this app already reads that env var — no code edit
     needed).
   - Once verified: **Sitemaps** → submit `sitemap.xml` (the app already
     serves this at `/sitemap.xml` via `src/app/sitemap.ts`).
   - Use **URL Inspection → Request Indexing** on the homepage and the
     Admissions page specifically — this is what gets a brand-new site
     its first crawl in days rather than waiting for Google to
     discover it on its own.
2. **Bing Webmaster Tools** (free, also feeds Bing/DuckDuckGo/Yahoo):
   bing.com/webmasters → you can import the verified site directly from
   a connected Google Search Console account in a couple of clicks.
3. **Google Business Profile** (free) — this is the single biggest
   lever for "school in Mion" specifically, separate from regular web
   search: business.google.com → create a listing for the school with
   the *exact same* address/phone you entered in Settings (step 4) so
   the two agree. This is what makes the school show up on Google Maps
   and in the local pack (the map + 3-listing block above regular
   results) when someone searches "school in Mion" or "school near me"
   from that area — regular website SEO alone does not do this.
4. Structured data is already in place: this pass added a schema.org
   `School` block (`src/components/site/school-jsonld.tsx`) rendered on
   the homepage, pulling the real address/phone/description from
   Settings. After deploying, paste your homepage URL into Google's
   [Rich Results Test](https://search.google.com/test/rich-results) to
   confirm it's read correctly.
5. Realistic timeline: verification and sitemap submission take minutes;
   actually appearing in search results typically takes days to a few
   weeks, and the Business Profile listing (once verified by Google's
   postcard/phone verification step) is usually what shows results
   fastest for a local "school in Mion" query.
