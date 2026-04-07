import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";
import { buildIcalFeed, ICalEvent } from "../../lib/ical.js";

const router = Router();

// GET /feed.ics — build iCal for parent's children
router.get("/feed.ics", async (req, res) => {
  const user = await requireUser(req, res, ["parent"]);
  if (!user) return;

  // Get parent's calendar_token
  const { data: parentUser, error: userError } = await dbClient
    .from("users")
    .select("calendar_token")
    .eq("id", user.id)
    .maybeSingle();

  if (userError) { res.status(500).json({ error: userError.message }); return; }

  const today = new Date().toISOString().slice(0, 10);

  // Get linked children
  const { data: links, error: linksError } = await dbClient
    .from("parent_student_links")
    .select("student_id, users!student_id(id, first_name, last_name)")
    .eq("parent_id", user.id);

  if (linksError) { res.status(500).json({ error: linksError.message }); return; }

  const events: ICalEvent[] = [];

  if (links && links.length > 0) {
    const childIds = links.map((l: any) => l.student_id);
    const studentNames = new Map(
      (links ?? []).map((l: any) => [
        l.student_id,
        `${l.users?.first_name ?? ""} ${l.users?.last_name ?? ""}`.trim(),
      ])
    );

    // Get enrollments with upcoming class dates
    const { data: enrollments, error: enrollError } = await dbClient
      .from("enrollments")
      .select(`
        id, student_id,
        skating_sessions(
          id, name,
          rink_locations(id, name),
          class_dates(id, class_date, start_time, end_time, is_cancelled)
        )
      `)
      .in("student_id", childIds)
      .is("dropped_at", null);

    if (enrollError) { res.status(500).json({ error: enrollError.message }); return; }

    for (const enrollment of enrollments ?? []) {
      const e = enrollment as any;
      const session = e.skating_sessions;
      if (!session) continue;
      const location = session.rink_locations?.name ?? undefined;
      const studentName = studentNames.get(e.student_id) ?? "";

      for (const cd of session.class_dates ?? []) {
        if (cd.class_date < today || cd.is_cancelled) continue;
        events.push({
          uid: `class-${cd.id}@skatetrack`,
          summary: `${session.name}${studentName ? ` (${studentName})` : ""}`,
          dtstart: cd.class_date,
          startTime: cd.start_time,
          endTime: cd.end_time,
          location,
        });
      }
    }

    // Get ice show practices for children's groups
    const { data: groupSessions, error: gsError } = await dbClient
      .from("ice_show_group_sessions")
      .select(`
        group_id,
        skating_sessions!inner(
          enrollments!inner(student_id)
        ),
        ice_show_groups(
          id, name,
          ice_show_practices(id, practice_date, start_time, end_time, location_id,
            rink_locations(id, name)
          )
        )
      `)
      .in("skating_sessions.enrollments.student_id", childIds);

    if (!gsError && groupSessions) {
      for (const gs of groupSessions as any[]) {
        const group = gs.ice_show_groups;
        if (!group) continue;
        for (const practice of group.ice_show_practices ?? []) {
          if (practice.practice_date < today) continue;
          events.push({
            uid: `practice-${practice.id}@skatetrack`,
            summary: `Ice Show Practice: ${group.name}`,
            dtstart: practice.practice_date,
            startTime: practice.start_time,
            endTime: practice.end_time,
            location: practice.rink_locations?.name ?? undefined,
          });
        }
      }
    }
  }

  const icsContent = buildIcalFeed(events, "SkateTrack Schedule");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="schedule.ics"');
  res.send(icsContent);
});

// GET /subscription-url — return webcal/google/outlook URLs
router.get("/subscription-url", async (req, res) => {
  const user = await requireUser(req, res, ["parent"]);
  if (!user) return;

  const { data: parentUser, error: userError } = await dbClient
    .from("users")
    .select("calendar_token")
    .eq("id", user.id)
    .maybeSingle();

  if (userError) { res.status(500).json({ error: userError.message }); return; }
  if (!parentUser?.calendar_token) { res.status(400).json({ error: "No calendar token found." }); return; }

  const host = req.headers.host ?? "localhost:4000";
  const feedPath = `/api/calendar/${parentUser.calendar_token}/feed.ics`;
  const httpUrl = `https://${host}${feedPath}`;
  const webcalUrl = `webcal://${host}${feedPath}`;
  const googleUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
  const outlookUrl = `https://outlook.live.com/owa/?path=/calendar/action/compose&rru=addsubscription&url=${encodeURIComponent(httpUrl)}&name=${encodeURIComponent("SkateTrack Schedule")}`;

  res.json({ webcalUrl, googleUrl, outlookUrl });
});

export default router;
