import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET / — all children's schedules
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["parent"]);
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);

  // Get linked children
  const { data: links, error: linksError } = await dbClient
    .from("parent_student_links")
    .select("student_id, users!student_id(id, first_name, last_name)")
    .eq("parent_id", user.id);

  if (linksError) { res.status(500).json({ error: linksError.message }); return; }
  if (!links || links.length === 0) { res.json([]); return; }

  const childIds = links.map((l: any) => l.student_id);

  const { data: enrollments, error: enrollError } = await dbClient
    .from("enrollments")
    .select(`
      id, student_id, created_at,
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
    .in("student_id", childIds)
    .is("dropped_at", null);

  if (enrollError) { res.status(500).json({ error: enrollError.message }); return; }

  // Group by student
  const studentMap = new Map(links.map((l: any) => [l.student_id, l.users]));

  const result = (links ?? []).map((link: any) => {
    const studentEnrollments = (enrollments ?? [])
      .filter((e: any) => e.student_id === link.student_id)
      .map((enrollment: any) => {
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

    return {
      student: link.users,
      enrollments: studentEnrollments,
    };
  });

  res.json(result);
});

export default router;
