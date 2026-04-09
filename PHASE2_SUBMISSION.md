# Project Phase 2 Submission — SkateTrack

## Status Update

**✅ Done this week (all 6 feature groups complete):**
- **Group A — Sessions & Locations:** Admin creates recurring class sessions by specifying level, instructor, rink location, day of week, and season dates. System auto-generates individual `class_dates`. Admin manages named rink locations with color coding.
- **Group B — Enrollment & Schedules:** Admin enrolls students into sessions with enrolled student list on session detail pages and ability to drop students. Students and parents view their own class schedules.
- **Group C — Attendance & Make-ups:** Instructors select a session → class date → toggle present/absent per student. Absent marks auto-create `makeup_requests`. Admin page shows pending makeups and assigns students to compatible available class dates.
- **Group D — Skills & Feedback Cards:** Instructors check off individual skills per student from a pre-seeded level checklist. Instructors write end-of-level feedback (personal note + sticker emoji). Admin prints feedback reports using `window.print()`.
- **Group E — Instructor Ratings & Reports:** Parents rate instructors (1–5 stars + comment) after session. Admin moderates before instructor sees approved ratings.
- **Group F (Individual Feature) — Calendar Export:** Parents and students export enrolled class dates as iCal (.ics), subscribe via webcal:// URL, or deep-link to Google Calendar / Outlook. Tokenized unauthenticated feed at `/api/calendar/:token/feed.ics`.

**⏳ Remaining before integration (Phase 3):**
- Phase 3 group schema alignment — coordinate shared table definitions with other I400 students for cross-system integration
- Final UI polish pass for mobile responsiveness
- Demo video for Phase 2 submission

---

## Unit Test Screenshot

Run with: `npm test --workspace apps/api`

All 6 tests in `apps/api/src/lib/dates.test.ts` pass:

```
▶ generateClassDates
  ✔ generates the correct number of Tuesdays in a 4-week span
  ✔ all dates fall on the correct weekday
  ✔ start and end times are passed through unchanged
  ✔ returns empty array when seasonEnd is before first matching day
  ✔ advances to first matching weekday when seasonStart is not the target day
  ✔ throws on invalid dayOfWeek
✔ generateClassDates (2.55ms)

tests 6 | pass 6 | fail 0
```

The `generateClassDates` function is the core of the scheduling system — it converts a session's day-of-week + season date range into individual class dates. Testing it directly (pure function, no DB) proves the scheduling logic is correct independent of the database.

---

## Security Analysis

### 3 Worst-Case Scenarios (Vulnerabilities That Required Fixes)

**1. Instructor horizontal privilege escalation — skill & feedback access across sessions**
An authenticated instructor could read or write skill assessments and feedback cards for any student in the system, not just their own students. For example, Instructor A could view Instructor B's private feedback notes, overwrite skill progress for students they've never met, or mark any student's skills as "passed." This violates the expectation that instructor access is scoped to their assigned sessions.

*Fixed:* `instructor/skills.ts` GET and `instructor/feedback.ts` GET/POST/PATCH now verify via `session_instructors` that the requesting instructor teaches the session for the given enrollment before allowing access. If not, they return HTTP 403.

**2. Instructor marks attendance for sessions they don't teach**
An instructor could POST attendance records for any class date in the system, including sessions assigned to other instructors. Since absent marks auto-create `makeup_requests`, a malicious instructor could fabricate absences and flood the makeup queue with bogus requests for students they've never worked with.

*Fixed:* `instructor/attendance.ts` GET and POST now check `session_instructors` after resolving the `class_date_id` to its `session_id`. If the instructor is not assigned to that session, they receive HTTP 403.

**3. Parent submits ratings for sessions their children don't attend**
A parent could rate any instructor for any session in the system, regardless of whether their child is enrolled. This pollutes the ratings data that admins use to evaluate instructors, and could be used to maliciously tank or boost instructor ratings.

*Fixed:* `parent/ratings.ts` POST now queries `parent_student_links` to get the parent's child IDs, then checks `enrollments` to confirm at least one child is actively enrolled in the rated session. If not, they receive HTTP 403.

---

### 3 Risks That Do Not Apply (Due to Stack/Domain)

**1. SQL injection — Not a threat**
The entire API uses the Supabase JavaScript SDK with chained query methods (`.eq()`, `.select()`, `.in()`, etc.). These are parameterized at the library level — no user input is ever string-interpolated into a SQL query. PostgREST (Supabase's query layer) never exposes raw SQL to the API layer.

**2. XSS (Cross-Site Scripting) — Not a threat**
The frontend is built with React 19 and JSX. React escapes all dynamic values by default before inserting them into the DOM — strings, user names, and notes are never set via `dangerouslySetInnerHTML`. There is no server-side HTML rendering. The only rich output is the iCal feed (plain text), which is never parsed as HTML by a browser.

**3. Unauthenticated bulk data access — Not a threat**
Every API route (except the tokenized calendar feed) requires a valid Supabase JWT. The calendar token endpoint is unauthenticated by design but is scoped strictly to the token owner's own data — students see only their class dates, parents see only their linked children's class dates. There is no endpoint that returns all users, all sessions, or any other aggregate without authentication.

---

## AI Security Dialogue

This entire conversation served as the security audit chat log. The agent reviewed all 23 route files and the auth middleware, identified 5 vulnerabilities requiring fixes (3 HIGH, 2 MEDIUM), and 3 non-issues confirmed by the stack.

**Prompt given to agent:** *"Read every file in apps/api/src/ and audit for security vulnerabilities. For each vulnerability found, report the file and line number, vulnerability type, exact code snippet, impact if exploited, and recommended fix. Focus on: routes that don't check the requester owns the resource, missing role checks, input validation gaps, the unauthenticated calendar token endpoint, CORS config, and any place where user-controlled strings are directly interpolated into queries."*

**Agent's key findings:**
- Instructor skill/feedback routes had auth (role check) but no authorization (ownership check) — HIGH
- Attendance routes same issue — HIGH  
- Parent ratings had no enrollment verification — MEDIUM
- Calendar feed had no explicit rejection for unsupported roles — LOW
- CORS confirmed properly configured (whitelist, not wildcard) — SECURE
- SQL injection confirmed not possible (parameterized SDK) — SECURE

**What was changed:** All 3 HIGH and 1 MEDIUM vulnerability were fixed in the same session. The LOW calendar role issue was also fixed as a defensive measure. Total: 5 files modified, 0 new dependencies introduced.

**Chat log:** [This conversation in Claude Code]

---

## GitHub Repos

- IU GitHub: https://github.iu.edu/I400sp25Vibe/nskotadi_skating
- GitHub.com: https://github.com/nickskotadis/nskotadi_skating

---

## Deployed URLs

- Frontend: https://web-three-mocha-90.vercel.app
- Backend: https://community-classes-api-bdpt.onrender.com
