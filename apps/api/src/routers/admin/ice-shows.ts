import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET / — list ice shows
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { data, error } = await dbClient
    .from("ice_shows")
    .select("*")
    .order("show_date", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

const createShowSchema = z.object({
  name: z.string().min(1).max(120),
  showDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(1000).optional(),
});

// POST / — create show
router.post("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = createShowSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await dbClient
    .from("ice_shows")
    .insert({ name: parsed.data.name, show_date: parsed.data.showDate, description: parsed.data.description ?? null })
    .select("*")
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

const updateShowSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  showDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().max(1000).optional(),
});

// PATCH /:id — update show
router.patch("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = updateShowSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.showDate !== undefined) updates.show_date = parsed.data.showDate;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update." }); return; }

  const { data, error } = await dbClient
    .from("ice_shows")
    .update(updates)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Ice show not found." }); return; }
  res.json(data);
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { error } = await dbClient.from("ice_shows").delete().eq("id", req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ message: "Ice show deleted." });
});

// GET /:id/groups — list groups for a show
router.get("/:id/groups", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { data, error } = await dbClient
    .from("ice_show_groups")
    .select(`
      id, name, sort_order,
      ice_show_group_sessions(
        id, session_id,
        skating_sessions(id, name)
      )
    `)
    .eq("show_id", req.params.id)
    .order("sort_order", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

const createGroupSchema = z.object({
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().min(0).optional(),
});

// POST /:id/groups — create group
router.post("/:id/groups", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await dbClient
    .from("ice_show_groups")
    .insert({ show_id: req.params.id, name: parsed.data.name, sort_order: parsed.data.sortOrder ?? 0 })
    .select("*")
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// POST /groups/:groupId/sessions — assign session to group
router.post("/groups/:groupId/sessions", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { sessionId } = req.body;
  if (!sessionId) { res.status(400).json({ error: "sessionId required." }); return; }

  const { data, error } = await dbClient
    .from("ice_show_group_sessions")
    .insert({ group_id: req.params.groupId, session_id: sessionId })
    .select("*")
    .single();

  if (error) { res.status(error.code === "23505" ? 409 : 500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// DELETE /groups/:groupId/sessions/:sessionId
router.delete("/groups/:groupId/sessions/:sessionId", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { error } = await dbClient
    .from("ice_show_group_sessions")
    .delete()
    .eq("group_id", req.params.groupId)
    .eq("session_id", req.params.sessionId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ message: "Session removed from group." });
});

// GET /groups/:groupId/practices — list practices
router.get("/groups/:groupId/practices", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { data, error } = await dbClient
    .from("ice_show_practices")
    .select("*, rink_locations(id, name)")
    .eq("group_id", req.params.groupId)
    .order("practice_date", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

const createPracticeSchema = z.object({
  practiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  locationId: z.string().uuid().optional(),
});

// POST /groups/:groupId/practices — create practice
router.post("/groups/:groupId/practices", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = createPracticeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await dbClient
    .from("ice_show_practices")
    .insert({
      group_id: req.params.groupId,
      practice_date: parsed.data.practiceDate,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      location_id: parsed.data.locationId ?? null,
    })
    .select("*")
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// DELETE /practices/:id
router.delete("/practices/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { error } = await dbClient.from("ice_show_practices").delete().eq("id", req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ message: "Practice deleted." });
});

export default router;
