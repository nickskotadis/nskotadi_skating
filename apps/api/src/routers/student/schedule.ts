import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET / — enrollments for the authenticated student
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["student"]);
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await dbClient
    .from("enrollments")
    .select(`
      id, created_at,
      skating_sessions(
        id, name, day_of_week, start_time, end_time, season_start, season_end, capacity,
        skating_levels(id, name),
        rink_locations(id, name),
        session_instructors(
          is_primary,
          users(id, first_name, last_name)
        ),
        class_dates(id, class_date, start_time, end_time, is_cancelled)
      )
    `)
    .eq("student_id", user.id)
    .is("dropped_at", null);

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Filter upcoming class dates client-side
  const result = (data ?? []).map((enrollment: any) => {
    const session = enrollment.skating_sessions;
    if (!session) return enrollment;
    const upcomingDates = (session.class_dates ?? []).filter(
      (cd: any) => cd.class_date >= today
    );
    return {
      ...enrollment,
      skating_sessions: { ...session, class_dates: upcomingDates },
    };
  });

  res.json(result);
});

export default router;
