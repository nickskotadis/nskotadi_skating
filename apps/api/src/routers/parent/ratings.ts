import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

const createRatingSchema = z.object({
  sessionId: z.string().uuid(),
  instructorId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// POST / — submit instructor rating
router.post("/", async (req, res) => {
  const user = await requireUser(req, res, ["parent"]);
  if (!user) return;

  const parsed = createRatingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const d = parsed.data;

  // Security fix: verify parent has a child enrolled in the rated session
  const { data: childLinks } = await dbClient
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", user.id);

  const childIds = (childLinks ?? []).map((l: any) => l.student_id);

  if (childIds.length === 0) {
    res.status(403).json({ error: "You have no children linked to your account." });
    return;
  }

  const { data: enrollment } = await dbClient
    .from("enrollments")
    .select("id")
    .eq("session_id", d.sessionId)
    .in("student_id", childIds)
    .is("dropped_at", null)
    .maybeSingle();

  if (!enrollment) {
    res.status(403).json({ error: "None of your children are enrolled in this session." });
    return;
  }

  const { data, error } = await dbClient
    .from("instructor_ratings")
    .insert({
      session_id: d.sessionId,
      instructor_id: d.instructorId,
      parent_id: user.id,
      rating: d.rating,
      comment: d.comment ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) { res.status(error.code === "23505" ? 409 : 500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

export default router;
