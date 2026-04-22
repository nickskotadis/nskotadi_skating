# SkateTrack — Skating School Management System

A full-stack web application that helps a local skating school move away from paper-based tracking. Covers class management, attendance, skill progression, instructor feedback cards, make-up sessions, parent/student/instructor dashboards, ice show scheduling, and calendar export.

**Stack:**
- Frontend: React 19 + Vite + TypeScript (`apps/web`)
- Backend: Express 4 + TypeScript (`apps/api`)
- Auth + Database: Supabase (PostgreSQL + Supabase Auth)
- Routing: React Router v6

---

## Demo

<a href="docs/videos/skatetrack-demo.mp4">
  <img src="docs/images/skatetrack-demo.png" alt="SkateTrack Demo" width="400">
</a>

---

> Developed in the class I400-Vibe and AI Programming, Spring 2026, IUB, with the assistance of Claude Sonnet 4.6 within Claude Code (Anthropic).

---

## Roles

| Role | Access |
|------|--------|
| `admin` | Full control — manage users, sessions, levels, rink zones, attendance, ice shows, ratings, reports |
| `instructor` | View assigned sessions, mark attendance, assess skills, write feedback cards |
| `parent` | View children's schedules, export to calendar, rate instructors |
| `student` | View own schedule, skill progress, and feedback cards |

All roles are enforced by the backend API (Bearer token + role check on every protected route).

---

## Nick's Feature: Parent Calendar Export

Parents can get calendar invites for their children's skating classes and ice show practices in whichever platform they use. Implementation in `apps/api/src/routers/parent/calendar.ts` and `apps/web/src/pages/parent/CalendarPage.tsx`:

- **Download `.ics`** — `GET /api/parent/calendar.ics` returns an RFC 5545 iCal file covering all enrolled class dates and ice show practices for the parent's children. Double-clicking imports into any calendar app.
- **Apple Calendar** — A `webcal://` subscription link opens the Calendar.app subscription dialog on macOS/iOS automatically.
- **Google Calendar** — A deep link to `calendar.google.com/calendar/r/settings/addbyurl` lets Google subscribe to the feed and keep it in sync.
- **Outlook** — A deep link to `outlook.live.com/calendar/0/addfromweb` adds the feed as a subscribed calendar.
- **Persistent feed** — Each user gets a stable `calendar_token` (UUID stored in `public.users`). The tokenized URL `GET /api/calendar/:token/feed.ics` works without an auth header, so external calendar apps can poll it on a schedule. Parents can regenerate their token via `POST /api/parent/calendar/reset-token` if they need to revoke access.

---

## Data Model

Run `apps/api/supabase/schema.sql` in the Supabase SQL editor. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Links Supabase auth users to roles + profile |
| `parent_student_links` | Maps parents to their children |
| `skating_levels` | Skill levels (Basic 1–8, etc.) |
| `skills` | Individual skills per level |
| `rink_locations` | Named ice rink zones (with SVG path for map overlay) |
| `skating_sessions` | Recurring class slots (level, location, day, time, season) |
| `session_instructors` | Which instructors teach each session (min 1 required) |
| `class_dates` | Individual meeting dates (auto-generated from session schedule) |
| `enrollments` | Student enrolled in a session for a season |
| `attendance` | Per-student attendance per class date |
| `makeup_requests` | Auto-created when a student is marked absent |
| `skill_assessments` | Per-student, per-skill status (not started / in progress / passed) |
| `feedback_cards` | End-of-level card: personal note + sticker, written by instructor |
| `instructor_ratings` | Parent rates instructor; admin moderates before instructor sees |
| `ice_shows` | Ice show event |
| `ice_show_groups` | Level groups within a show |
| `ice_show_practices` | Practice slots per group (linked to rink locations) |

The schema seeds Basic 1–8 levels with their US Figure Skating skills on first run.

---

## Setup

### 1. Create a Supabase project

Collect from your project settings:
- Project URL
- Publishable (anon) key
- Service role key

### 2. Run the database schema

Open the Supabase SQL Editor and run:
```
apps/api/supabase/schema.sql
```

This drops any old tables and creates the full SkateTrack schema plus seed data.

### 3. Configure backend environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
SUPABASE_URL="https://YOUR-PROJECT-ID.supabase.co"
SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_PUBLISHABLE_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
CORS_ORIGINS="https://YOUR-VERCEL-DOMAIN.vercel.app,http://localhost:5173"
PORT=4000
```

### 4. Configure frontend environment

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
VITE_API_BASE_URL="http://localhost:4000"
```

### 5. Install and run

```bash
npm install
npm run dev
```

- Web: `http://localhost:5173`
- API health check: `http://localhost:4000/health`

### 6. Create your first admin account

Sign up via the web app (role: Admin), then verify the row appears in your Supabase `public.users` table. The first admin can then manage all other users.

---

## Running Tests

```bash
npm test --workspace apps/api
```

Tests live in `apps/api/src/lib/dates.test.ts` and use Node's built-in test runner (no extra dependencies). The `generateClassDates` function is tested end-to-end as a pure function — no database connection needed.

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create account (`email`, `password`, `firstName`, `lastName`, `role`) |
| POST | `/api/auth/login` | Login, returns `accessToken` + `role` |
| GET | `/api/auth/me` | Returns current user profile |

### Admin — Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id` | Update role, name, or phone |
| POST | `/api/admin/users/:parentId/link-child` | Link a parent to a student |
| DELETE | `/api/admin/users/:parentId/link-child/:studentId` | Remove parent-student link |
| GET | `/api/admin/users/parent-student-links/all` | List all parent-student links |

### Admin — Levels & Skills
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/levels` | List all levels |
| POST | `/api/admin/levels` | Create a level |
| PATCH | `/api/admin/levels/:id` | Update a level |
| DELETE | `/api/admin/levels/:id` | Delete a level |
| GET | `/api/admin/levels/:levelId/skills` | List skills for a level |
| POST | `/api/admin/levels/:levelId/skills` | Add a skill to a level |
| PATCH | `/api/admin/levels/skills/:id` | Update a skill |
| DELETE | `/api/admin/levels/skills/:id` | Delete a skill |

---

## Production Deployment (Render + Vercel)

### Render (API)

Use `render.yaml` as the source of truth. Create a **Blueprint** service in Render or manually configure:
- Build: `npm --workspace apps/api run build`
- Start: `npm --workspace apps/api run start`
- Health check: `/health`

Required environment variables:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGINS` — must exactly match your Vercel domain

### Vercel (Frontend)

Use `apps/web/vercel.json`. Set root directory to `apps/web`.

Required environment variable:
- `VITE_API_BASE_URL` — Render API URL, **no trailing slash**

Redeploy after setting env vars. Verify with `https://YOUR-RENDER-API.onrender.com/health` returning `{"status":"ok"}`.
