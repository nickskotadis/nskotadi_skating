import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET / — list ratings with details
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const statusParam = req.query.status as string | undefined;

  let query = dbClient
    .from("instructor_ratings")
    .select(`
      id, rating, comment, status, created_at,
      session:skating_sessions(id, name),
      instructor:users!instructor_id(id, first_name, last_name),
      parent:users!parent_id(id, first_name, last_name)
    `)
    .order("created_at", { ascending: false });

  if (statusParam && ["pending", "approved", "rejected"].includes(statusParam)) {
    query = query.eq("status", statusParam);
  }

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

const updateRatingSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

// PATCH /:id — approve or reject rating
router.patch("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = updateRatingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await dbClient
    .from("instructor_ratings")
    .update({ status: parsed.data.status })
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Rating not found." }); return; }
  res.json(data);
});

export default router;
