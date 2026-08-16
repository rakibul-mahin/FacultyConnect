# FacultyConnect

*Faculty Consultation & Student Booking System*

A production-quality departmental scheduling app: faculty maintain one weekly teaching/consultation
routine, students search faculty and book open consultation slots. Two roles only — **FACULTY** and
**STUDENT**, no admin. Built to run on **$0/month** for a small department using entirely free-tier
services.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the system design, data model, and security model in depth.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui-style components (Radix primitives) ·
Motion · lucide-react · Prisma ORM · Supabase PostgreSQL · NextAuth.js v5 (Google OAuth) · `qrcode`
(local QR generation) · React Hook Form + Zod · date-fns / date-fns-tz · Netlify hosting.

## 1. Requirements

- Node.js 20+ and npm
- Git
- A GitHub account (to host the repo and connect Netlify)
- A [Supabase](https://supabase.com) account (free tier)
- A [Netlify](https://netlify.com) account (free tier)
- A [Google Cloud](https://console.cloud.google.com) account (free) for OAuth credentials

## 2. Local setup

```bash
git clone <your-repo-url>
cd consultationmanagement
npm install
cp .env.example .env   # then fill in real values, see sections 3-4 below
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open http://localhost:3000. Sign in with Google using a `@bracu.ac.bd` (faculty) or `@g.bracu.ac.bd`
(student) account — see §4 for setting up Google OAuth credentials first.

## 3. Supabase setup

1. Create a new project at supabase.com (the free tier is sufficient for a single department).
2. Go to **Project Settings → Database → Connection string**.
3. Copy the **Transaction pooler** connection string (port `6543`) into `DATABASE_URL` in your `.env` —
   this is the serverless-friendly pooled connection Prisma Client uses at runtime.
4. Copy the **Direct connection** string (port `5432`) into `DIRECT_URL` — this is used only by
   `prisma migrate`, never at request time.
5. Never commit these values. `.env` is gitignored; only `.env.example` (with placeholders) is committed.
6. Run migrations against Supabase:
   ```bash
   npx prisma migrate deploy
   ```
   Optionally run `npm run db:seed` to populate sample data for local testing (see §8, Scripts) — skip
   this for a production database you want to start empty.

## 4. Google OAuth setup

Two institutional domains are accepted — faculty sign in with `@bracu.ac.bd`, students with
`@g.bracu.ac.bd`. The server verifies the domain from Google's verified email on every sign-in; it is
never trusted from the client (see ARCHITECTURE.md §5, §8).

1. In [Google Cloud Console](https://console.cloud.google.com), create (or reuse) a project.
2. **APIs & Services → OAuth consent screen** — configure it (Internal or External + verification as
   your institution requires).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Web application.
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<your-site>.netlify.app/api/auth/callback/google` (production)
5. Copy the generated **Client ID** and **Client Secret** into `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`. Never commit the client secret.

## 5. Environment variables

Copy `.env.example` → `.env` for local dev. The same variable names are used in Netlify's environment
variable settings for production — see §7.

| Variable | Purpose | Public? |
|---|---|---|
| `DATABASE_URL` | Supabase pooled Postgres connection string (Prisma Client, runtime) | No |
| `DIRECT_URL` | Supabase direct Postgres connection string (`prisma migrate` only) | No |
| `AUTH_SECRET` | NextAuth session/JWT signing secret — generate with `openssl rand -base64 32` | No |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth app credentials | No |
| `NEXTAUTH_URL` | Canonical app URL for OAuth callbacks | No |
| `NEXT_PUBLIC_APP_URL` | Base URL used client-side to build QR deep links | **Yes** |

Only `NEXT_PUBLIC_APP_URL` is safe to expose to the browser; nothing else should ever use the
`NEXT_PUBLIC_` prefix.

There is no demo/bypass login — every sign-in goes through real Google OAuth, and the server derives
the role strictly from the verified email's domain (`@bracu.ac.bd` → FACULTY, `@g.bracu.ac.bd` →
STUDENT). See ARCHITECTURE.md §5/§8 for how this is enforced.

## 6. Netlify deployment

1. Push the repo to GitHub.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
3. Netlify auto-detects Next.js App Router via `@netlify/plugin-nextjs` (declared in `netlify.toml`) —
   no custom build/publish overrides are needed beyond what's already committed.
4. **Site configuration → Environment variables** — add every variable from §5 with production values
   (production `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` should be your Netlify site URL).
5. Deploy. `postinstall` runs `prisma generate` automatically during the build (it only needs
   `DATABASE_URL` to be *set*, not reachable, since `generate` doesn't connect to the database).
6. Run `npx prisma migrate deploy` against the Supabase database once (locally, or via a one-off CI
   step) before or after the first deploy — Netlify's build does not run migrations automatically.
7. Add the production redirect URI to the Google OAuth client (§4) and re-test sign-in in production.

## 7. Scripts

```bash
npm run dev          # start the dev server
npm run build         # production build
npm run start          # run the production build locally
npm run lint            # eslint
npm run typecheck        # tsc --noEmit
npm run test               # vitest (see §8)
npm run db:generate         # prisma generate
npm run db:migrate           # prisma migrate dev
npm run db:deploy             # prisma migrate deploy (production)
npm run db:seed                # populate optional sample/test data (skip for a clean production DB)
npm run db:studio               # Prisma Studio
npm run db:reset                 # drop, re-migrate, and re-seed (local dev only)
```

## 8. Running tests

Tests run against a **separate** Postgres database (never your dev or production database) so
`beforeEach` can freely truncate tables between tests.

1. Create a test database, e.g. `createdb consultation_test` (or a separate free Supabase project/branch).
2. Copy `.env.example` → `.env.test` and point `DATABASE_URL`/`DIRECT_URL` at that test database.
3. Apply the schema: `DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy`.
4. `npm run test`

The suite ([tests/unit](./tests/unit), [tests/integration](./tests/integration)) covers, per the
acceptance checklist:

- **Parser** — official-format TSV parsing, quoted multi-line cells, lab pairing/absorption, invalid
  lab start times, unrecognized content → `NEEDS_REVIEW` (never guessed).
- **Import** — Added/Changed/Removed/Unchanged diffing, preview is read-only until confirmed,
  `NEEDS_REVIEW` rows are skipped on confirm, paired lab import.
- **Timezone** — Asia/Dhaka calendar-day math (today/tomorrow, not a rolling 24h window).
- **Validation** — domain → role derivation, capacity/reason/course-code shape rules.
- **Booking capacity & deadline** — fills exactly to capacity then rejects with `FULL`, rejects
  duplicate bookings, allows the same student to book multiple slots/faculty, rejects booking today,
  allows booking tomorrow, rejects booking a cancelled occurrence.
- **Concurrency** — ten students racing for three seats simultaneously never overbooks the occurrence.
- **Privacy & authorization** — the public/student occurrence list never serializes another student's
  identity or reason; a student only ever sees their own booking position; a faculty member cannot read,
  cancel, or mark attendance on another faculty member's occurrence/booking; one student's bookings never
  leak into another's list.
- **Routine/lab rules** — creating a lab auto-occupies the paired slot, invalid lab start times are
  rejected, clearing either half removes both, creating a lab never mutates the co-faculty's own routine.
- **Attendance & history** — attendance is recorded and updatable; cancelling an occurrence keeps the
  occurrence and its bookings as a historical record instead of deleting them.
- **Student self-cancellation** — a student can cancel their own booking (soft-cancel, never deleted),
  which immediately frees the seat for others and lets them re-book later; they cannot cancel another
  student's booking, cancel an already-cancelled one, or cancel once the consultation date has passed;
  the faculty roster keeps the cancelled row visible (marked "Cancelled by student") for history.
- **QR** — token creation, and regeneration invalidates the old token while the new one resolves.
- **Occurrence generation** — lazy generation only materializes matching weekdays within the window,
  is idempotent on repeat calls, and never generates occurrences for THEORY/LAB entries.

## 9. Free-tier limitations to be aware of

- **Supabase free tier**: paused after 7 days of inactivity (auto-resumes on next request, with a short
  cold-start delay); ~500MB database storage; limited concurrent connections — mitigated by using the
  pooled connection string and a singleton Prisma Client (ARCHITECTURE.md §11).
- **Netlify free tier**: 100GB bandwidth/month and 300 build minutes/month; functions have a request
  timeout (typically 10s on the free tier) — all Server Actions/route handlers in this app are simple
  single-transaction database operations well under that.
- **No background jobs**: consultation occurrences are generated lazily/idempotently on page load
  instead of via a scheduled job, specifically to avoid needing a paid cron service (ARCHITECTURE.md §4).
- **No email**: booking confirmations are in-app only in this version (§55 of the brief) — see
  `lib/notify.ts` for the single extension point where email could be added later without touching
  booking/routine logic.
- **Google OAuth verification**: if your Google Cloud OAuth consent screen is in "Testing" mode, only
  explicitly added test users can sign in: add real faculty/student test accounts, or publish the app
  (may require Google's verification review for some scopes, though this app only requests basic
  profile/email).

## 10. Project structure

```
app/
  (faculty-app)/faculty/      faculty-only dashboard, routine, bookings, history, QR, profile
  (public-faculty)/faculty/[publicId]/   QR/search target — any authenticated user, booking UI for students
  (student-app)/student/      student-only dashboard, search, bookings, profile
  api/auth/[...nextauth]/     NextAuth route handler
  login/                      login page + server action (Google OAuth)
components/
  ui/          base shadcn/ui-style primitives (Radix + Tailwind)
  routine/     routine grid, entry editor, import flow
  booking/     booking dialog, bookable week grid, attendance/cancel controls
  auth/        login view
  layout/      app shell (sidebar/nav)
  qr/          QR panel
  profile/     profile forms
lib/
  auth/        NextAuth config, session helpers, role/domain provisioning
  db/          Prisma client singleton
  booking/     occurrence generation, booking service (capacity/concurrency), privacy-safe queries
  routine/     routine CRUD service, import diff/apply
  parser/      Google Sheets clipboard parser
  qr/          QR generation/regeneration
  validation/  Zod schemas
  timezone.ts  Asia/Dhaka date helpers
  constants.ts official routine format (days/slots/lab rules)
prisma/
  schema.prisma, migrations/, seed.ts
tests/
  unit/, integration/, helpers/
```

## 11. Security notes

- Roles are derived once, server-side, from the verified Google account's email domain — never from
  client-supplied data (ARCHITECTURE.md §5, §8, §45).
- Every Server Action re-derives the acting user from the server session and intersects it with the
  requested record's ownership; nothing trusts a client-supplied `facultyId`/`studentId` for anything
  other than "which record," and access queries are scoped by the authenticated session's own ID.
- Booking capacity is enforced inside a `Serializable` database transaction, not "count then create" —
  see ARCHITECTURE.md §6.
- Private booking fields (reason, course/section, group ID, student identity) are only ever selected in
  server code for the owning student or the owning faculty member — enforced in the data-access layer,
  not hidden in the UI.
