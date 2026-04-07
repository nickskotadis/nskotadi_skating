import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET / — list linked students for this parent
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["parent"]);
  if (!user) return;

  const { data, error } = await dbClient
    .from("parent_student_links")
    .select(`
      id, student_id,
      users!student_id(id, first_name, last_name, role, created_at)
    `)
    .eq("parent_id", user.id);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

export default router;
