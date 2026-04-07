import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET / — list makeups
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const statusParam = req.query.status as string | undefined;
  const showAll = statusParam === "all";

  let query = dbClient
    .from("makeup_requests")
    .select(`
      id, status, created_at,
      makeup_date_id, makeup_session_id,
      enrollments(
        id, student_id,
        users(id, first_name, last_name),
        skating_sessions(id, name)
      ),
      missed_date:class_dates!missed_date_id(id, class_date, start_time, end_time),
      makeup_date:class_dates!makeup_date_id(id, class_date, start_time, end_time)
    `)
    .order("created_at", { ascending: false });

  if (!showAll) {
    query = query.eq("status", "pending");
  }

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

const updateMakeupSchema = z.object({
  status: z.enum(["pending", "scheduled", "completed", "waived"]),
  makeupDateId: z.string().uuid().optional(),
});

// PATCH /:id — update makeup status
router.patch("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = updateMakeupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.makeupDateId !== undefined) updates.makeup_date_id = parsed.data.makeupDateId;

  const { data, error } = await dbClient
    .from("makeup_requests")
    .update(updates)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Makeup request not found." }); return; }
  res.json(data);
});

export default router;
