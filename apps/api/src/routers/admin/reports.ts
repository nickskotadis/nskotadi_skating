import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET /feedback?sessionId=xxx
router.get("/feedback", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: "sessionId query parameter is required." });
    return;
  }

  // Get session level
  const { data: session, error: sessionError } = await dbClient
    .from("skating_sessions")
    .select("id, level_id, skating_levels(id, name)")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) { res.status(500).json({ error: sessionError.message }); return; }
  if (!session) { res.status(404).json({ error: "Session not found." }); return; }

  // Get active enrollments for the session
  const { data: enrollments, error: enrollError } = await dbClient
    .from("enrollments")
    .select(`
      id, student_id,
      users!student_id(id, first_name, last_name)
    `)
    .eq("session_id", sessionId)
    .is("dropped_at", null);

  if (enrollError) { res.status(500).json({ error: enrollError.message }); return; }
  if (!enrollments || enrollments.length === 0) { res.json([]); return; }

  const enrollmentIds = enrollments.map((e: any) => e.id);

  // Fetch skill_assessments for all enrollments
  const { data: assessments, error: assessError } = await dbClient
    .from("skill_assessments")
    .select(`
      id, enrollment_id, status, notes,
      skills(id, name, sort_order)
    `)
    .in("enrollment_id", enrollmentIds);

  if (assessError) { res.status(500).json({ error: assessError.message }); return; }

  // Fetch feedback cards for all enrollments
  const { data: feedbackCards, error: feedbackError } = await dbClient
    .from("feedback_cards")
    .select("enrollment_id, personal_note, sticker, published_at, created_at")
    .in("enrollment_id", enrollmentIds);

  if (feedbackError) { res.status(500).json({ error: feedbackError.message }); return; }

  // Build response
  const assessmentsByEnrollment = new Map<string, any[]>();
  for (const a of assessments ?? []) {
    const list = assessmentsByEnrollment.get(a.enrollment_id) ?? [];
    list.push(a);
    assessmentsByEnrollment.set(a.enrollment_id, list);
  }

  const feedbackByEnrollment = new Map(
    (feedbackCards ?? []).map((fc: any) => [fc.enrollment_id, fc])
  );

  const result = enrollments.map((e: any) => ({
    student: {
      firstName: e.users?.first_name ?? null,
      lastName: e.users?.last_name ?? null,
    },
    level: session.skating_levels,
    skills: assessmentsByEnrollment.get(e.id) ?? [],
    feedbackCard: feedbackByEnrollment.get(e.id) ?? null,
  }));

  res.json(result);
});

export default router;
