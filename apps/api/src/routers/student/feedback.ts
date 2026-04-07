import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET /:enrollmentId — get published feedback card for this enrollment
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
    .from("feedback_cards")
    .select("*")
    .eq("enrollment_id", req.params.enrollmentId)
    .not("published_at", "is", null)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Feedback not yet published." }); return; }
  res.json(data);
});

export default router;
