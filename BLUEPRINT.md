# SkateTrack – Project Blueprint

**By: Nick Skotadis**

---

## 1. Project Concept

**SkateTrack** is a full-stack web application that helps a local skating school move away from paper-based tracking. It supports daily session management, student skill progression, attendance tracking, instructor feedback cards, and ice show scheduling — with a dedicated dashboard for each user role.

**Technical Stack**

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript (Vercel) |
| Backend | Node.js + Express 4 + TypeScript (Render) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT, Bearer tokens) |
| CSS | Custom CSS with CSS variables (no component library) |
| Routing | React Router v6 |

---

## 2. Vibe-Coding Tasks (Phase 2 Prompts)

These are the specific prompts / tasks to drive Phase 2 development:

1. **Sessions CRUD** — "Build class session creation: admin picks level, instructor(s), rink location, day of week, time, season start/end dates. Auto-generate individual class dates from that recurring schedule."

2. **Enrollment** — "Let admin enroll a student into a session. Show the enrolled student list on the session detail page. Let admin drop a student from a session."

3. **Attendance marking** — "Build an attendance page for instructors: select a session → select a class date → toggle present/absent per student. When a student is marked absent, auto-create a makeup request."

4. **Makeup requests** — "Build an admin page showing pending makeup requests. Admin can assign the student to an available class date in any compatible session to fulfill the makeup."

5. **Rink locations** — "Admin can create named rink zones (name + color). Show a simple rink map as SVG zones on the schedule pages so parents and students can see where their class is."

6. **Skill assessments** — "Instructor checks off individual skills per student. Each enrollment gets a pre-seeded checklist of all skills for that level. Show a progress grid per student."

7. **Feedback cards** — "Instructor writes an end-of-level feedback card per student (personal note + sticker emoji). Admin can print feedback reports for a whole session. Use window.print() with print CSS."

8. **Parent calendar export** — "Generate an iCal (.ics) file for all enrolled class dates. Add a 'Subscribe' URL (webcal://) and deep links for Google Calendar and Outlook on the parent dashboard."

9. **Ice show management** — "Admin creates an ice show event, divides sessions into groups, assigns practice times per group. Parents and students see ice show practices in their schedule."

10. **Instructor ratings** — "Parent rates an instructor (1–5 stars + comment) after a session. Admin moderates before the instructor can see approved ratings."

---

## 3. Economic Forecast (10 requests/user/month)

| Metric | 500 Users | 5,000 Users | 50,000 Users |
|--------|-----------|-------------|--------------|
| Monthly requests | 5,000 | 50,000 | 500,000 |
| Vercel (frontend CDN) | $0 (free tier¹) | $20 (Pro) | ~$35 |
| Render (API server) | $0 (free tier²) | $7 (Starter) | $25 (Standard) |
| Supabase (DB + Auth) | $0 (free tier³) | $25 (Pro) | ~$45 (Pro + add-ons) |
| **Monthly total** | **$0** | **~$52** | **~$105+** |

**Free tier limits referenced:**
1. Vercel Free: 100 GB bandwidth/month, 6,000 min build time
2. Render Free: 750 instance-hours/month (spins down on inactivity)
3. Supabase Free: 500 MB database, 2 GB bandwidth, 50,000 MAU

**Cost note:** SkateTrack avoids heavy image storage — feedback card "stickers" are emoji characters, not uploaded images. Profile photos are also out of scope for MVP. Storage costs remain minimal across all tiers.

**References:** Vercel Pricing (vercel.com/pricing), Render Pricing (render.com/pricing), Supabase Pricing (supabase.com/pricing)

---

## 4. Testing Roadmap

### Unit Tests
- `apps/api/src/lib/dates.ts` — `generateClassDates(session)` is a pure function (takes session params, returns an array of date objects). Testable without a DB connection.
- `apps/api/src/lib/ical.ts` — `buildIcalFeed(events[])` is a pure string-building function. Output can be diffed against expected RFC 5545 format.

### Integration Tests
- Use a Supabase **test project** (separate from production) with the same schema.
- Test: POST `/api/auth/signup` → verify row appears in `public.users` with correct role.
- Test: POST `/api/auth/login` → verify JWT returned → GET `/api/auth/me` succeeds with that token.
- Test: PATCH `/api/admin/users/:id` with a non-admin token → verify 403 response.

### Manual Auth Flow Testing
1. Sign up as each of the 4 roles (admin, instructor, parent, student).
2. Verify each redirects to the correct role-specific dashboard.
3. Try accessing `/admin` as a non-admin → verify redirect to own dashboard.
4. Log out → verify token is cleared and redirect to `/login`.

### Auth Video Proof
Screen-record: sign up form → submit → open Supabase Table Editor → show `public.users` row with correct role and profile fields.

---

## 5. Security Notes

### Potential Risks
- **Broken object-level authorization**: A parent could try to view another parent's child's feedback card by guessing a UUID. Mitigated by: all sensitive endpoints check the requesting user's role and ownership (e.g., parent can only fetch children linked via `parent_student_links`). Supabase RLS provides defense-in-depth.
- **Role escalation via signup**: The signup endpoint currently accepts a `role` parameter (included for demo purposes). In production this field would be removed — roles would be assigned only by admins. The code includes a comment noting this.
- **Token exposure**: JWT tokens are stored in `localStorage`. This is appropriate for a school app on trusted devices but would be upgraded to httpOnly cookies for a higher-security deployment.

### Non-Issues for This Domain
- **SQL injection**: Not a risk because all DB access goes through `@supabase/supabase-js` (PostgREST), which parameterizes all queries automatically. Raw SQL strings are never concatenated.
- **XSS via user content**: React renders all dynamic content as text (not `innerHTML`), so user-supplied strings (names, notes, skill descriptions) cannot inject scripts.
