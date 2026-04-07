import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET / — sessions where this instructor is assigned
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["instructor"]);
  if (!user) return;

  const { data, error } = await dbClient
    .from("session_instructors")
    .select(`
      session_id, is_primary,
      skating_sessions(
        id, name, day_of_week, start_time, end_time, season_start, season_end, capacity, created_at,
        skating_levels(id, name),
        rink_locations(id, name),
        class_dates(id)
      )
    `)
    .eq("instructor_id", user.id);

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Reshape to return session objects with class_date count
  const sessions = (data ?? []).map((row: any) => {
    const s = row.skating_sessions;
    if (!s) return null;
    const { class_dates, ...sessionRest } = s;
    return {
      ...sessionRest,
      is_primary: row.is_primary,
      class_dates_count: Array.isArray(class_dates) ? class_dates.length : 0,
    };
  }).filter(Boolean);

  res.json(sessions);
});

export default router;
