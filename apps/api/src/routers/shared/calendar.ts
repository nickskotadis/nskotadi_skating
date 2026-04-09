import { Router } from "express";
import { dbClient } from "../../middleware/auth.js";
import { buildIcalFeed, ICalEvent } from "../../lib/ical.js";

const router = Router();

// GET /:token/feed.ics — unauthenticated calendar feed by token
router.get("/:token/feed.ics", async (req, res) => {
  const { token } = req.params;

  // Look up user by calendar_token
  const { data: calUser, error: userError } = await dbClient
    .from("users")
    .select("id, role, first_name, last_name, calendar_token")
    .eq("calendar_token", token)
    .maybeSingle();

  if (userError) { res.status(500).json({ error: userError.message }); return; }
  if (!calUser) { res.status(404).json({ error: "Calendar not found." }); return; }

  const today = new Date().toISOString().slice(0, 10);
  const events: ICalEvent[] = [];

  if (calUser.role === "student") {
    // Get student's own class dates
    const { data: enrollments, error: enrollError } = await dbClient
      .from("enrollments")
      .select(`
        id,
        skating_sessions(
          id, name,
          rink_locations(id, name),
          class_dates(id, class_date, start_time, end_time, is_cancelled)
        )
      `)
      .eq("student_id", calUser.id)
      .is("dropped_at", null);

    if (!enrollError) {
      for (const enrollment of enrollments ?? []) {
        const e = enrollment as any;
        const session = e.skating_sessions;
        if (!session) continue;
        for (const cd of session.class_dates ?? []) {
          if (cd.class_date < today || cd.is_cancelled) continue;
          events.push({
            uid: `class-${cd.id}@skatetrack`,
            summary: session.name,
            dtstart: cd.class_date,
            startTime: cd.start_time,
            endTime: cd.end_time,
            location: session.rink_locations?.name ?? undefined,
          });
        }
      }
    }

    // Ice show practices for student's groups
    const { data: groupSessions } = await dbClient
      .from("ice_show_group_sessions")
      .select(`
        group_id,
        skating_sessions!inner(
          enrollments!inner(student_id)
        ),
        ice_show_groups(
          id, name,
          ice_show_practices(id, practice_date, start_time, end_time,
            rink_locations(id, name)
          )
        )
      `)
      .eq("skating_sessions.enrollments.student_id", calUser.id);

    for (const gs of groupSessions ?? [] as any[]) {
      const group = (gs as any).ice_show_groups;
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
  // Security fix: reject unsupported roles explicitly rather than returning blank calendar
  } else if (calUser.role === "parent") {
    // Get children
    const { data: links } = await dbClient
      .from("parent_student_links")
      .select("student_id, users!student_id(id, first_name, last_name)")
      .eq("parent_id", calUser.id);

    if (links && links.length > 0) {
      const childIds = links.map((l: any) => l.student_id);
      const studentNames = new Map(
        (links ?? []).map((l: any) => [
          l.student_id,
          `${l.users?.first_name ?? ""} ${l.users?.last_name ?? ""}`.trim(),
        ])
      );

      const { data: enrollments } = await dbClient
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

      for (const enrollment of enrollments ?? []) {
        const e = enrollment as any;
        const session = e.skating_sessions;
        if (!session) continue;
        const studentName = studentNames.get(e.student_id) ?? "";
        for (const cd of session.class_dates ?? []) {
          if (cd.class_date < today || cd.is_cancelled) continue;
          events.push({
            uid: `class-${cd.id}@skatetrack`,
            summary: `${session.name}${studentName ? ` (${studentName})` : ""}`,
            dtstart: cd.class_date,
            startTime: cd.start_time,
            endTime: cd.end_time,
            location: session.rink_locations?.name ?? undefined,
          });
        }
      }

      // Ice show practices
      const { data: groupSessions } = await dbClient
        .from("ice_show_group_sessions")
        .select(`
          group_id,
          skating_sessions!inner(
            enrollments!inner(student_id)
          ),
          ice_show_groups(
            id, name,
            ice_show_practices(id, practice_date, start_time, end_time,
              rink_locations(id, name)
            )
          )
        `)
        .in("skating_sessions.enrollments.student_id", childIds);

      for (const gs of groupSessions ?? [] as any[]) {
        const group = (gs as any).ice_show_groups;
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
  } else {
    // Security fix: reject any other roles (admin, instructor) — calendar feed is for students/parents only
    res.status(403).json({ error: "Calendar feed is not available for this role." });
    return;
  }

  const calName = `SkateTrack - ${calUser.first_name ?? "Schedule"}`;
  const icsContent = buildIcalFeed(events, calName);

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="schedule.ics"');
  res.send(icsContent);
});

export default router;
