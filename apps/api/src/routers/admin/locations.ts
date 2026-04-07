import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin", "instructor", "student", "parent"]);
  if (!user) return;
  const { data, error } = await dbClient
    .from("rink_locations")
    .select("id, name, description, svg_path, color_hex, sort_order, created_at")
    .order("sort_order", { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.post("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() }); return; }
  const { data, error } = await dbClient
    .from("rink_locations")
    .insert({ name: parsed.data.name, description: parsed.data.description ?? null, color_hex: parsed.data.colorHex ?? "#93c5fd", sort_order: parsed.data.sortOrder ?? 0 })
    .select("id, name, description, svg_path, color_hex, sort_order, created_at")
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  svgPath: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.patch("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.colorHex !== undefined) updates.color_hex = parsed.data.colorHex;
  if (parsed.data.svgPath !== undefined) updates.svg_path = parsed.data.svgPath;
  if (parsed.data.sortOrder !== undefined) updates.sort_order = parsed.data.sortOrder;
  const { data, error } = await dbClient.from("rink_locations").update(updates).eq("id", req.params.id).select("id, name, description, svg_path, color_hex, sort_order, created_at").maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Location not found." }); return; }
  res.json(data);
});

router.delete("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;
  const { error } = await dbClient.from("rink_locations").delete().eq("id", req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ message: "Location deleted." });
});

export default router;
