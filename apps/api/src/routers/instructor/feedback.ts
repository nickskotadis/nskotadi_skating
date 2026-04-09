import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// Helper: verify instructor teaches the session for this enrollment (returns session_id or null)
async function verifyInstructorOwnsEnrollment(
  enrollmentId: string,
  instructorId: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const { data: enrollment, error: enrollError } = await dbClient
    .from("enrollments")
    .select("session_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (enrollError) return { ok: false, status: 500, error: enrollError.message };
  if (!enrollment) return { ok: false, status: 404, error: "Enrollment not found." };

  const { data: instrLink, error: instrError } = await dbClient
    .from("session_instructors")
    .select("id")
    .eq("session_id", enrollment.session_id)
    .eq("instructor_id", instructorId)
    .maybeSingle();

  if (instrError) return { ok: false, status: 500, error: instrError.message };
  if (!instrLink) return { ok: false, status: 403, error: "You do not teach this session." };

  return { ok: true };
}

// GET /:enrollmentId — get feedback card
router.get("/:enrollmentId", async (req, res) => {
  const user = await requireUser(req, res, ["instructor"]);
  if (!user) return;

  // Security fix: verify instructor teaches the session for this enrollment
  const check = await verifyInstructorOwnsEnrollment(req.params.enrollmentId, user.id);
  if (!check.ok) { res.status(check.status!).json({ error: check.error }); return; }

  const { data, error } = await dbClient
    .from("feedback_cards")
    .select("*")
    .eq("enrollment_id", req.params.enrollmentId)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Feedback card not found." }); return; }
  res.json(data);
});

const createFeedbackSchema = z.object({
  personalNote: z.string().max(2000),
  sticker: z.string().max(100).optional(),
});

// POST /:enrollmentId — create feedback card
router.post("/:enrollmentId", async (req, res) => {
  const user = await requireUser(req, res, ["instructor"]);
  if (!user) return;

  // Security fix: verify instructor teaches the session for this enrollment
  const check = await verifyInstructorOwnsEnrollment(req.params.enrollmentId, user.id);
  if (!check.ok) { res.status(check.status!).json({ error: check.error }); return; }

  const parsed = createFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await dbClient
    .from("feedback_cards")
    .insert({
      enrollment_id: req.params.enrollmentId,
      personal_note: parsed.data.personalNote,
      sticker: parsed.data.sticker ?? null,
    })
    .select("*")
    .single();

  if (error) { res.status(error.code === "23505" ? 409 : 500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

const updateFeedbackSchema = z.object({
  personalNote: z.string().max(2000).optional(),
  sticker: z.string().max(100).optional(),
  publish: z.boolean().optional(),
});

// PATCH /:enrollmentId — update feedback card
router.patch("/:enrollmentId", async (req, res) => {
  const user = await requireUser(req, res, ["instructor"]);
  if (!user) return;

  // Security fix: verify instructor teaches the session for this enrollment
  const check = await verifyInstructorOwnsEnrollment(req.params.enrollmentId, user.id);
  if (!check.ok) { res.status(check.status!).json({ error: check.error }); return; }

  const parsed = updateFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.personalNote !== undefined) updates.personal_note = parsed.data.personalNote;
  if (parsed.data.sticker !== undefined) updates.sticker = parsed.data.sticker;
  if (parsed.data.publish === true) updates.published_at = new Date().toISOString();

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  const { data, error } = await dbClient
    .from("feedback_cards")
    .update(updates)
    .eq("enrollment_id", req.params.enrollmentId)
    .select("*")
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Feedback card not found." }); return; }
  res.json(data);
});

export default router;
