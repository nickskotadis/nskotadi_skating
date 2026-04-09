import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET /:enrollmentId — get all skill_assessments for an enrollment
router.get("/:enrollmentId", async (req, res) => {
  const user = await requireUser(req, res, ["instructor"]);
  if (!user) return;

  // Security fix: verify instructor teaches the session this enrollment belongs to
  const { data: enrollment, error: enrollError } = await dbClient
    .from("enrollments")
    .select("session_id")
    .eq("id", req.params.enrollmentId)
    .maybeSingle();

  if (enrollError) { res.status(500).json({ error: enrollError.message }); return; }
  if (!enrollment) { res.status(404).json({ error: "Enrollment not found." }); return; }

  const { data: instrLink, error: instrError } = await dbClient
    .from("session_instructors")
    .select("id")
    .eq("session_id", enrollment.session_id)
    .eq("instructor_id", user.id)
    .maybeSingle();

  if (instrError) { res.status(500).json({ error: instrError.message }); return; }
  if (!instrLink) { res.status(403).json({ error: "You do not teach this session." }); return; }

  const { data, error } = await dbClient
    .from("skill_assessments")
    .select(`
      id, status, notes, assessed_by, class_date_id, created_at,
      skills(id, name, sort_order, description)
    `)
    .eq("enrollment_id", req.params.enrollmentId)
    .order("skills(sort_order)", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

const updateAssessmentSchema = z.object({
  status: z.enum(["not_started", "in_progress", "passed", "not_applicable"]),
  notes: z.string().max(1000).optional(),
});

// PATCH /:assessmentId — update one assessment
router.patch("/:assessmentId", async (req, res) => {
  const user = await requireUser(req, res, ["instructor"]);
  if (!user) return;

  const parsed = updateAssessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  // Get assessment to verify instructor teaches the session
  const { data: assessment, error: assessError } = await dbClient
    .from("skill_assessments")
    .select("id, enrollment_id, enrollments(session_id)")
    .eq("id", req.params.assessmentId)
    .maybeSingle();

  if (assessError) { res.status(500).json({ error: assessError.message }); return; }
  if (!assessment) { res.status(404).json({ error: "Assessment not found." }); return; }

  const sessionId = (assessment.enrollments as any)?.session_id;
  if (!sessionId) { res.status(404).json({ error: "Session not found for this enrollment." }); return; }

  // Verify instructor teaches this session
  const { data: instrLink, error: instrError } = await dbClient
    .from("session_instructors")
    .select("id")
    .eq("session_id", sessionId)
    .eq("instructor_id", user.id)
    .maybeSingle();

  if (instrError) { res.status(500).json({ error: instrError.message }); return; }
  if (!instrLink) { res.status(403).json({ error: "You do not teach this session." }); return; }

  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    assessed_by: user.id,
  };
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const { data, error } = await dbClient
    .from("skill_assessments")
    .update(updates)
    .eq("id", req.params.assessmentId)
    .select("*")
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Assessment not found." }); return; }
  res.json(data);
});

export default router;
