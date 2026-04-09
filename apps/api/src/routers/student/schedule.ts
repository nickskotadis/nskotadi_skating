import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET / — schedule entries for the authenticated student
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["student"]);
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await dbClient
    .from("enrollments")
    .select(`
      id,
      skating_sessions(
        id, name, day_of_week, start_time, end_time,
        skating_levels(id, name),
        rink_locations(id, name, color_hex),
        session_instructors(is_primary, users(id, first_name, last_name)),
        class_dates(id, class_date, start_time, end_time, is_cancelled)
      )
    `)
    .eq("student_id", user.id)
    .is("dropped_at", null);

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Transform to { session, upcoming_dates }[]
  const result = (data ?? []).map((enrollment: any) => {
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
