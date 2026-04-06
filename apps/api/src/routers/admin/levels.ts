import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET /api/admin/levels – list all levels with skills
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin", "instructor"]);
  if (!user) return;

  const { data, error } = await dbClient
    .from("skating_levels")
    .select("id, name, sort_order, description, created_at")
    .order("sort_order", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

const createLevelSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0),
});

// POST /api/admin/levels
router.post("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = createLevelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await dbClient
    .from("skating_levels")
    .insert({
      name: parsed.data.name,
      sort_order: parsed.data.sortOrder,
      description: parsed.data.description ?? null,
    })
    .select("id, name, sort_order, description, created_at")
    .single();

  if (error) {
    res.status(error.code === "23505" ? 409 : 500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

const updateLevelSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// PATCH /api/admin/levels/:id
router.patch("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = updateLevelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.sortOrder !== undefined) updates.sort_order = parsed.data.sortOrder;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  const { data, error } = await dbClient
    .from("skating_levels")
    .update(updates)
    .eq("id", req.params.id)
    .select("id, name, sort_order, description, created_at")
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!data) {
    res.status(404).json({ error: "Level not found." });
    return;
  }

  res.json(data);
});

// DELETE /api/admin/levels/:id
router.delete("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { error } = await dbClient
    .from("skating_levels")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: "Level deleted." });
});

// GET /api/admin/levels/:levelId/skills
router.get("/:levelId/skills", async (req, res) => {
  const user = await requireUser(req, res, ["admin", "instructor"]);
  if (!user) return;

  const { data, error } = await dbClient
    .from("skills")
    .select("id, level_id, name, description, sort_order, created_at")
    .eq("level_id", req.params.levelId)
    .order("sort_order", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

const createSkillSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// POST /api/admin/levels/:levelId/skills
router.post("/:levelId/skills", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = createSkillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await dbClient
    .from("skills")
    .insert({
      level_id: req.params.levelId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      sort_order: parsed.data.sortOrder ?? 0,
    })
    .select("id, level_id, name, description, sort_order, created_at")
    .single();

  if (error) {
    res.status(error.code === "23505" ? 409 : 500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

const updateSkillSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// PATCH /api/admin/skills/:id
router.patch("/skills/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = updateSkillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.sortOrder !== undefined) updates.sort_order = parsed.data.sortOrder;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  const { data, error } = await dbClient
    .from("skills")
    .update(updates)
    .eq("id", req.params.id)
    .select("id, level_id, name, description, sort_order, created_at")
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!data) {
    res.status(404).json({ error: "Skill not found." });
    return;
  }

  res.json(data);
});

// DELETE /api/admin/skills/:id
router.delete("/skills/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { error } = await dbClient
    .from("skills")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: "Skill deleted." });
});

export default router;
