import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET /?childId=xxx — schedule entries for a specific child (or all children if omitted)
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["parent"]);
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);

  // Get linked children
  const { data: links, error: linksError } = await dbClient
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", user.id);

  if (linksError) { res.status(500).json({ error: linksError.message }); return; }
  if (!links || links.length === 0) { res.json([]); return; }

  let childIds = links.map((l: any) => l.student_id);

  // Filter to a specific child if requested
  const { childId } = req.query;
  if (childId && typeof childId === "string") {
    if (!childIds.includes(childId)) {
      res.status(403).json({ error: "Not your child." });
      return;
    }
    childIds = [childId];
  }

  const { data: enrollments, error: enrollError } = await dbClient
    .from("enrollments")
    .select(`
      id, student_id,
      skating_sessions(
        id, name, day_of_week, start_time, end_time,
        skating_levels(id, name),
        rink_locations(id, name, color_hex),
        session_instructors(is_primary, users(id, first_name, last_name)),
        class_dates(id, class_date, start_time, end_time, is_cancelled)
      )
    `)
    .in("student_id", childIds)
    .is("dropped_at", null);

  if (enrollError) { res.status(500).json({ error: enrollError.message }); return; }

  // Transform to { session, upcoming_dates }[]
  const result = (enrollments ?? []).map((enrollment: any) => {
    const session = enrollment.skating_sessions;
    if (!session) return null;
    const upcomingDates = (session.class_dates ?? [])
      .filter((cd: any) => cd.class_date >= today)
      .sort((a: any, b: any) => a.class_date.localeCompare(b.class_date));
    const { class_dates: _, ...sessionWithoutDates } = session;
    return {
      session: sessionWithoutDates,
      upcoming_dates: upcomingDates,
    };
  }).filter(Boolean);

  res.json(result);
});

export default router;
