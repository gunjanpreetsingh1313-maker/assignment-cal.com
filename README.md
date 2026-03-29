# Scheduling platform (Cal.com–style)

Production-lean demo: **Next.js (App Router)** frontend on port **3000** and **Express + MySQL** backend on port **5000**, talking over **REST**. No authentication (single demo tenant).

## Repository layout

```text
frontend/   # Next.js + Tailwind + shadcn/ui + RHF + Zod + date-fns
backend/    # Express + mysql2 + TypeScript
```

## Prerequisites

- Node.js 20+
- MySQL 8+ (or compatible)

## MySQL setup

1. Start MySQL and create a user/database (or use `root` locally).
2. Copy env files:
   - `backend/.env.example` → `backend/.env`
   - `frontend/.env.example` → `frontend/.env.local` (optional; defaults to `http://localhost:5000`)
3. From `backend/`, create schema and seed:

```bash
npm run db:setup
npm run db:seed
```

`db:setup` runs `src/db/schema.sql` (creates database `scheduling` and tables). `db:seed` inserts two event types, Mon–Fri 9–5 availability (America/New_York), sample bookings, and a demo user row.

## Run backend

```bash
cd backend
npm install
npm run dev
```

API: `http://localhost:5000` — try `GET /api/health`.

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000` — redirects to `/dashboard`.

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/event-types` | List all event types |
| `GET` | `/api/event-types?slug=:slug` | Single event type by slug (public page) |
| `POST` | `/api/event-types` | Create event type |
| `PUT` | `/api/event-types/:id` | Update event type |
| `DELETE` | `/api/event-types/:id` | Delete (cascades availability & bookings) |
| `GET` | `/api/availability/:eventTypeId` | List availability rows |
| `POST` | `/api/availability` | Replace all availability for an event type |
| `GET` | `/api/bookings` | List bookings (with event metadata) |
| `POST` | `/api/bookings` | Create booking (overlap check + row lock) |
| `PATCH` | `/api/bookings/:id` | Update status (`CONFIRMED` / `CANCELLED`) |
| `GET` | `/api/slots?eventTypeId=&date=` | Available slots for a calendar date |

### Slot generation (backend)

1. Determine **weekday** from the requested ISO date (UTC noon trick avoids DST edge cases in date math).
2. Load **availability** windows for that weekday and event type.
3. Step each window by **event duration**; each candidate slot is `[start, start + duration)`.
4. Remove slots overlapping **CONFIRMED** bookings on that **date** (minute-resolution overlap).
5. Double booking prevention: transaction locks the **event_types** row, re-reads bookings for the date, applies the same overlap rule, then inserts.

## Database schema (summary)

Raw SQL lives in `backend/src/db/schema.sql`.

- **users** — `id`, `name` (optional seed; not wired to event types in this demo).
- **event_types** — `title`, `description`, `duration` (minutes), unique `slug`, `created_at`.
- **availability** — `day_of_week` (0=Sun … 6=Sat), `start_time`, `end_time`, `timezone`, `event_type_id` (FK).
- **bookings** — guest `name`/`email`, `date`, `start_time`, `end_time`, `event_type_id`, `status` (`CONFIRMED` | `CANCELLED`), `created_at`.

## Frontend routes

- `/dashboard` — Event types CRUD, copy/open booking link, availability editor.
- `/dashboard/bookings` — Upcoming vs past lists, cancel (PATCH).
- `/book/[slug]` — Public booking: calendar, live slots, form, confirmation.

## Assumptions & limits

- **No auth**: anyone with the dashboard URL can manage data; suitable for local demos only.
- **Timezone field** on availability is stored and shown through the UI; slot math uses **wall-clock** times with the requested **calendar date** (no full IANA conversion layer on the server — document as MVP).
- **One availability pattern per save**: weekdays share the same start/end window in the dashboard (mirrors common Cal-style weekly grid).
- **No external scheduling SDKs**; slot generation is custom Express logic.

## Scripts reference

| Location | Command | Purpose |
|----------|---------|---------|
| backend | `npm run dev` | `tsx watch src/server.ts` |
| backend | `npm run build` / `npm start` | Compile & run `dist/server.js` |
| backend | `npm run db:setup` | Apply `schema.sql` |
| backend | `npm run db:seed` | Apply `seed.sql` to configured DB |
| frontend | `npm run dev` | Next dev server |
| frontend | `npm run build` / `npm start` | Production build |

## Seed URLs

After seeding, try:

- Dashboard: `http://localhost:3000/dashboard`
- Public: `http://localhost:3000/book/discovery-call` and `/book/deep-dive`
