import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET /:enrollmentId — get feedback card
router.get("/:enrollmentId", async (req, res) => {
  const user = await requireUser(req, res, ["instructor"]);
  if (!user) return;

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
