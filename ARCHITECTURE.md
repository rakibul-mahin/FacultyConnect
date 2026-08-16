# Architecture — FacultyConnect (Faculty Consultation & Student Booking System)

## 1. System Overview

A departmental scheduling application with two roles — **FACULTY** and **STUDENT** — built entirely on
free-tier infrastructure:

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server Components + Server Actions avoid a separate API server |
| Language | TypeScript | Type safety across DB ↔ server ↔ client boundary |
| UI | Tailwind CSS + shadcn/ui + lucide-react + Motion | Free, no runtime license, accessible primitives |
| Database | Supabase PostgreSQL (Free tier) | Managed Postgres, generous free tier, works with any Postgres client |
| ORM | Prisma | Type-safe queries, migrations, works well in serverless |
| Auth | NextAuth.js (Auth.js) v5 — Google OAuth provider only | No paid auth vendor |
| QR | `qrcode` npm package | Generates PNG/SVG server-side, no external QR API |
| Hosting | Netlify (Free tier) + `@netlify/plugin-nextjs` (OpenNext-based) | Free hosting, native Next.js support |

No admin role. No paid services. No background job server — all recurring-schedule state is derived
lazily (see §7).

## 2. Database Schema (Prisma)

Core models (see `prisma/schema.prisma` for the authoritative source):

- **User** — one row per authenticated identity (`email`, `googleId`, `role`). Role is derived from the
  authenticated email's domain at first login and never trusted from client input (see §5).
- **FacultyProfile** — 1:1 with `User` where `role = FACULTY`. `publicId` (UUID) is the stable
  QR/search target. Holds `fullName`, `initial`, `seat`.
- **StudentProfile** — 1:1 with `User` where `role = STUDENT`. Holds `studentId`, `fullName`. Booking is
  blocked until `studentId` is set (§21).
- **RoutineEntry** — the **recurring weekly template**. One row per (faculty, day, startSlot) with
  `type` (THEORY / LAB / CONSULTATION), and type-specific fields. A LAB occupies two consecutive
  `RoutineEntry` rows (`isLabContinuation` flag on the second) but they share one `labGroupId` so they are
  edited/deleted together (§17).
- **ConsultationOccurrence** — a **materialized single date instance** of a recurring CONSULTATION
  `RoutineEntry` (e.g. "Sunday 11:00" → "2026-08-23 11:00"). Generated **lazily** (§7), never by cron.
  Carries `capacity` (copied from the routine entry at generation time, or overridden by faculty),
  `status` (OPEN / CANCELLED), and is the row that `Booking` references.
- **Booking** — a student's reservation against one `ConsultationOccurrence`. Carries `type`
  (THESIS_INTERNSHIP_PROJECT / COURSE / OTHERS) and type-specific fields (`groupId`, `courseCode`,
  `section`, `reason`). `reason`/type fields are private (§23, enforced server-side). A DB **unique
  constraint** on `(occurrenceId, studentId)` prevents duplicate booking of the same slot; capacity is
  enforced transactionally (§6, §43).
- **Attendance** — 1:1 with `Booking`, written after the consultation by faculty (`PRESENT` / `ABSENT`).
  Historical, permanent, never deleted.
- **QrToken** — 1:1 with `FacultyProfile`. Regenerating creates a new `token` (UUID) and marks the old
  row's `revokedAt`, invalidating old QR images without deleting history.

All models use UUID public identifiers (`@default(uuid())` / `cuid`), `createdAt`/`updatedAt`
timestamps, and indexes on every lookup path called out in the spec (faculty email, student email,
faculty initial, `(facultyId, day, startSlot)`, occurrence date, `(occurrenceId, studentId)`, `qrToken`).

## 3. Recurring Routine vs. Occurrence (critical distinction)

- `RoutineEntry` (type = CONSULTATION) is the **template**: "every Sunday at 11:00, capacity 4."
- `ConsultationOccurrence` is a **dated instance**: "Sunday 2026-08-23 11:00, capacity 4, OPEN."
- `Booking` always references an `ConsultationOccurrence`, never a `RoutineEntry` directly.
- `Attendance` always references a `Booking`.

This lets faculty change next week's template without altering the historical record of a past date,
and lets a single date be cancelled without touching the recurring template.

## 4. Occurrence Generation Strategy (free-tier, no cron)

Per requirement §54/§7, there is no scheduled job. Instead, occurrence generation is **lazy and
idempotent**:

- Whenever a page needs occurrences for a faculty member in a date window (faculty dashboard "upcoming
  consultations", student-facing routine/booking view, faculty booking list), the server calls
  `ensureOccurrences(facultyId, fromDate, toDate)`.
- That function reads all CONSULTATION `RoutineEntry` rows for the faculty, computes which calendar
  dates in the window match each entry's weekday, and `upsert`s a `ConsultationOccurrence` per
  (routineEntryId, date) using a compound unique constraint — so calling it repeatedly is a no-op for
  dates that already exist.
- Default generation window: today → +28 days, refreshed on every relevant page load. This bounds table
  growth (no infinite future rows) while always keeping "tomorrow" and the next few weeks bookable.

## 5. Authentication & Domain Verification

- NextAuth Google OAuth provider is the production path. On `signIn`, the callback inspects the verified
  email returned by Google (never a client-supplied field):
  - `@bracu.ac.bd` → role `FACULTY`
  - `@g.bracu.ac.bd` → role `STUDENT`
  - Anything else → sign-in rejected.
- The `User.role` is set **once**, server-side, at first successful sign-in from the verified email
  domain, and stored in the database + JWT session. All later authorization checks read `session.user.role`
  from the server-verified session, never from a client payload.
- There is no bypass/demo login provider — Google OAuth is the only sign-in path in every environment.
  `prisma/seed.ts` remains available as an optional local-dev data-population script (`npm run db:seed`),
  but it only creates database rows for testing; it is not wired into authentication in any way.

## 6. Booking Concurrency & Capacity Safety

Booking creation runs inside a single Prisma **interactive transaction** with `Serializable` isolation:

```
prisma.$transaction(async (tx) => {
  const occurrence = await tx.consultationOccurrence.findUniqueOrThrow({ where: { id }, select: { capacity: true, status: true, date: true } });
  if (occurrence.status !== 'OPEN') throw new BookingError('CANCELLED');
  const count = await tx.booking.count({ where: { occurrenceId: id, status: 'CONFIRMED' } });
  if (count >= occurrence.capacity) throw new BookingError('FULL');
  return tx.booking.create({ data: { occurrenceId: id, studentId, ... } }); // unique (occurrenceId, studentId) also guards duplicates
}, { isolationLevel: 'Serializable' })
```

Serializable isolation forces Postgres to abort the losing side of concurrent transactions racing for
the last seat with a serialization error, which the server catches and retries (bounded, with jitter,
re-checking capacity fresh on each attempt) or surfaces as "That consultation is already full." This —
plus the DB-level unique constraint on `(occurrenceId, studentId)` — is the enforcement point; the UI
capacity display is presentation only.

## 7. Booking Deadline Rule (calendar-day, Asia/Dhaka)

`lib/timezone.ts` centralizes all date math on `Asia/Dhaka` using `date-fns-tz`:

- `dhakaToday()` — current calendar date in Asia/Dhaka, derived from `new Date()` (server clock), never
  from the browser.
- A booking is allowed iff `occurrence.date > dhakaToday()` (strict calendar-day comparison, not a
  24-hour rolling window) — i.e. earliest bookable date is tomorrow.

## 8. Privacy Model

- `Booking.reason`, `courseCode`, `section`, `groupId`, and the joined student identity are only ever
  selected by server code when the caller is (a) the owning student, or (b) the faculty member who owns
  the occurrence. This is enforced in the data-access layer (`lib/booking/queries.ts`), not by hiding
  fields in the UI.
- The "public" occurrence view (used for the booking grid) returns only `bookedCount`/`capacity`, never
  a list of bookings.
- Every Server Action re-derives the acting user from the server session; it never trusts an `facultyId`
  /`studentId` field passed from the client for anything other than "which record are you asking about,"
  and always intersects that with `session.user.id` in the `WHERE` clause.

## 9. Authorization Summary

| Action | Allowed |
|---|---|
| Edit routine / consultation / capacity | Owning faculty only |
| View booking roster + private reason | Owning faculty + the booking's own student |
| Mark attendance | Owning faculty only |
| Cancel occurrence | Owning faculty only |
| Create booking | Any authenticated student with a complete profile, for a future OPEN occurrence |
| Cancel booking | The owning student (their own booking, while the occurrence date hasn't passed) or the owning faculty (via cancelling the whole occurrence) |
| View faculty public routine | Any authenticated user |
| Regenerate QR | Owning faculty only |

## 10. Google Sheet Import Parser

Not OCR — plain text. Faculty selects the 9×7 range in their Google Sheet routine and copies it; the
browser clipboard contains TSV (`\t` between columns, `\n` between rows). `lib/parser/routine-parser.ts`:

1. Splits on `\n` → rows (expects 7, one per day starting Saturday), splits each row on `\t` → cells
   (expects 9, one per fixed time column).
2. Each non-empty cell is 1–3 lines (`\n` inside a pasted cell is preserved by Sheets as a literal
   newline in the TSV cell text): line 1 = `COURSE-SECTION` or `COURSE-SECTION (LAB)`, line 2 = room
   (theory) or `CoFaculty,Initial` (lab line 2) — matched against the official examples in §16/§17/§19.
3. Positional meaning is fixed by the spec (§38) — column *n* is always the same clock time, row *n* is
   always the same weekday. The parser never guesses from content alone; anything that doesn't match one
   of the THEORY/LAB known shapes is flagged `NEEDS_REVIEW` with the raw text preserved, never silently
   dropped or guessed.
4. Lab-specific validation: a `(LAB)` suffix is only valid on columns 1/3/5 (8:00/11:00/2:00); the parser
   synthesizes the paired continuation slot automatically and marks both `NEEDS_REVIEW` if the following
   column is non-empty (would collide).
5. Output is a `ParsedRoutine` (pure data, no DB writes) that the UI diffs client-side against the
   faculty's current `RoutineEntry` rows (Added / Changed / Removed / Unchanged) before the faculty
   clicks **Confirm Changes**, which is the only step that writes to the database (inside one
   transaction, replacing entries day-by-day so a half-applied import can't happen).

## 11. Netlify Deployment

- `netlify.toml` sets the Next.js build command/publish dir and lets Netlify's official Next.js runtime
  (auto-detected, OpenNext-based) handle Server Components/Actions/Route Handlers.
- `postinstall: prisma generate` guarantees the Prisma Client is generated in Netlify's build
  environment (no local DB dependency at build time — build only needs `DATABASE_URL` to be *set*, not
  reachable, since `prisma generate` doesn't connect to the DB).
- `lib/db/prisma.ts` uses the standard singleton pattern (`globalThis.prisma`) so Netlify's Lambda-style
  functions reuse one client per warm instance instead of opening a new pool per invocation. Supabase's
  pooled connection string (port 6543, pgbouncer) is documented in `README.md` as the value to put in
  `DATABASE_URL` for serverless use, with `DIRECT_URL` (port 5432) used only for running migrations.

## 12. Environment Variables

| Variable | Purpose | Public? |
|---|---|---|
| `DATABASE_URL` | Supabase pooled Postgres connection string (used by Prisma Client at runtime) | No |
| `DIRECT_URL` | Supabase direct connection string (used by `prisma migrate`) | No |
| `AUTH_SECRET` | NextAuth session/JWT signing secret | No |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth app credentials | No |
| `NEXTAUTH_URL` | Canonical app URL for OAuth callbacks | No |
| `NEXT_PUBLIC_APP_URL` | Base URL used client-side for QR deep links | Yes |

## 13. What Is Intentionally Not Built

Per §68/§55/§54: no admin role, no chat/messaging, no payments, no AI, no email delivery, no
Redis/queues, no external calendar sync, no paid cron. The notification system is architected as a
single extension point (`lib/notify.ts` — currently a no-op logger) so email could be bolted on later
without touching booking/routine logic.
