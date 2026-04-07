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
