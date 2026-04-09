import { Router } from "express";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET / — instructors for sessions the parent's children are enrolled in
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["parent"]);
  if (!user) return;

  // Get linked children
  const { data: links, error: linksError } = await dbClient
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", user.id);

  if (linksError) { res.status(500).json({ error: linksError.message }); return; }
  if (!links || links.length === 0) { res.json([]); return; }

  const childIds = links.map((l: any) => l.student_id);

  // Get active enrollments with session and instructor info
  const { data: enrollments, error: enrollError } = await dbClient
    .from("enrollments")
    .select(`
      skating_sessions(
        id, name,
        session_instructors(
          instructor_id,
          users(id, first_name, last_name)
        )
      )
    `)
    .in("student_id", childIds)
    .is("dropped_at", null);

  if (enrollError) { res.status(500).json({ error: enrollError.message }); return; }

  // Deduplicate: one entry per instructor+session combo
  const seen = new Set<string>();
  const result: { id: string; first_name: string; last_name: string; session_id: string; session_name: string }[] = [];

  for (const enrollment of enrollments ?? [] as any[]) {
    const session = (enrollment as any).skating_sessions;
    if (!session) continue;
    for (const si of session.session_instructors ?? []) {
      const instructor = si.users;
      if (!instructor) continue;
      const key = `${instructor.id}:${session.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        id: instructor.id,
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        session_id: session.id,
        session_name: session.name,
      });
    }
  }

  res.json(result);
});

export default router;
