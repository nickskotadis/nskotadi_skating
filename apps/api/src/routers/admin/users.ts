import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";
import type { UserRole } from "../../lib/types.js";

const router = Router();

// GET /api/admin/users – list all users
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { data, error } = await dbClient
    .from("users")
    .select("id, role, first_name, last_name, phone, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

const updateUserSchema = z.object({
  role: z.enum(["admin", "instructor", "parent", "student"]).optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().max(30).optional(),
});

// PATCH /api/admin/users/:id – update user profile or role
router.patch("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.firstName !== undefined) updates.first_name = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) updates.last_name = parsed.data.lastName;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  const { data, error } = await dbClient
    .from("users")
    .update(updates)
    .eq("id", req.params.id)
    .select("id, role, first_name, last_name, phone, created_at")
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!data) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.json(data);
});

const linkSchema = z.object({
  studentId: z.string().uuid(),
});

// POST /api/admin/users/:parentId/link-child
router.post("/:parentId/link-child", async (req, res) => {
  const admin = await requireUser(req, res, ["admin"]);
  if (!admin) return;

  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "studentId (UUID) required." });
    return;
  }

  // Verify both users exist and have correct roles
  const { data: parent } = await dbClient
    .from("users")
    .select("role")
    .eq("id", req.params.parentId)
    .maybeSingle();

  if (!parent || (parent.role as UserRole) !== "parent") {
    res.status(400).json({ error: "User is not a parent." });
    return;
  }

  const { data: student } = await dbClient
    .from("users")
    .select("role")
    .eq("id", parsed.data.studentId)
    .maybeSingle();

  if (!student || (student.role as UserRole) !== "student") {
    res.status(400).json({ error: "User is not a student." });
    return;
  }

  const { error } = await dbClient.from("parent_student_links").insert({
    parent_id: req.params.parentId,
    student_id: parsed.data.studentId,
  });

  if (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: "Link already exists." });
      return;
    }
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json({ message: "Parent-student link created." });
});

// DELETE /api/admin/users/:parentId/link-child/:studentId
router.delete("/:parentId/link-child/:studentId", async (req, res) => {
  const admin = await requireUser(req, res, ["admin"]);
  if (!admin) return;

  const { error } = await dbClient
    .from("parent_student_links")
    .delete()
    .eq("parent_id", req.params.parentId)
    .eq("student_id", req.params.studentId);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: "Link removed." });
});

// GET /api/admin/parent-student-links
router.get("/parent-student-links/all", async (req, res) => {
  const admin = await requireUser(req, res, ["admin"]);
  if (!admin) return;

  const { data, error } = await dbClient
    .from("parent_student_links")
    .select(
      `id, parent_id, student_id, created_at,
       parent:users!parent_student_links_parent_id_fkey(first_name, last_name),
       student:users!parent_student_links_student_id_fkey(first_name, last_name)`
    )
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

export default router;
