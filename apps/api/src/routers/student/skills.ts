import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET /:enrollmentId — skill_assessments for this enrollment
router.get("/:enrollmentId", async (req, res) => {
  const user = await requireUser(req, res, ["student"]);
  if (!user) return;

  // Verify enrollment belongs to this student
  const { data: enrollment, error: enrollError } = await dbClient
    .from("enrollments")
    .select("id, student_id")
    .eq("id", req.params.enrollmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (enrollError) { res.status(500).json({ error: enrollError.message }); return; }
  if (!enrollment) { res.status(404).json({ error: "Enrollment not found." }); return; }

  const { data, error } = await dbClient
    .from("skill_assessments")
    .select(`
      id, status, notes, assessed_by, class_date_id,
      skills(id, name, sort_order, description)
    `)
    .eq("enrollment_id", req.params.enrollmentId)
    .order("skills(sort_order)", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

export default router;
