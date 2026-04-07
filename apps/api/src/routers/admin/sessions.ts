import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";
import { generateClassDates } from "../../lib/dates.js";

const router = Router();

// GET / — list all sessions with joins
router.get("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { data, error } = await dbClient
    .from("skating_sessions")
    .select(`
      id, name, day_of_week, start_time, end_time, season_start, season_end, capacity, created_at,
      skating_levels(id, name),
      rink_locations(id, name),
      session_instructors(instructor_id, is_primary, users(id, first_name, last_name))
    `)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

const createSessionSchema = z.object({
  name: z.string().min(1).max(120),
  levelId: z.string().uuid(),
  locationId: z.string().uuid(),
  dayOfWeek: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  seasonStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seasonEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  capacity: z.number().int().min(1),
  instructorIds: z.array(z.string().uuid()).min(0),
});

// POST / — create session
router.post("/", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const d = parsed.data;

  const { data: session, error: sessionError } = await dbClient
    .from("skating_sessions")
    .insert({
      name: d.name,
      level_id: d.levelId,
      location_id: d.locationId,
      day_of_week: d.dayOfWeek,
      start_time: d.startTime,
      end_time: d.endTime,
      season_start: d.seasonStart,
      season_end: d.seasonEnd,
      capacity: d.capacity,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (sessionError) { res.status(500).json({ error: sessionError.message }); return; }

  // Generate and insert class dates
  let classDates: ReturnType<typeof generateClassDates> = [];
  try {
    classDates = generateClassDates({
      seasonStart: d.seasonStart,
      seasonEnd: d.seasonEnd,
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      endTime: d.endTime,
    });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid schedule" });
    return;
  }

  if (classDates.length > 0) {
    const { error: datesError } = await dbClient.from("class_dates").insert(
      classDates.map((cd) => ({ session_id: session.id, ...cd }))
    );
    if (datesError) { res.status(500).json({ error: datesError.message }); return; }
  }

  // Insert session_instructors
  if (d.instructorIds.length > 0) {
    const { error: instrError } = await dbClient.from("session_instructors").insert(
      d.instructorIds.map((instructorId, idx) => ({
        session_id: session.id,
        instructor_id: instructorId,
        is_primary: idx === 0,
      }))
    );
    if (instrError) { res.status(500).json({ error: instrError.message }); return; }
  }

  res.status(201).json(session);
});

// GET /:id — get single session with details
router.get("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { data, error } = await dbClient
    .from("skating_sessions")
    .select(`
      *,
      skating_levels(id, name),
      rink_locations(id, name),
      session_instructors(instructor_id, is_primary, users(id, first_name, last_name)),
      class_dates(id, class_date, start_time, end_time, is_cancelled),
      enrollments(id, student_id, dropped_at, created_at, users(id, first_name, last_name))
    `)
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Session not found." }); return; }
  res.json(data);
});

const updateSessionSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  capacity: z.number().int().min(1).optional(),
});

// PATCH /:id — update session metadata
router.patch("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const parsed = updateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.capacity !== undefined) updates.capacity = parsed.data.capacity;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  const { data, error } = await dbClient
    .from("skating_sessions")
    .update(updates)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Session not found." }); return; }
  res.json(data);
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { error } = await dbClient.from("skating_sessions").delete().eq("id", req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ message: "Session deleted." });
});

// POST /:id/instructors — add instructor
router.post("/:id/instructors", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { instructorId } = req.body;
  if (!instructorId) { res.status(400).json({ error: "instructorId required." }); return; }

  const { data, error } = await dbClient
    .from("session_instructors")
    .insert({ session_id: req.params.id, instructor_id: instructorId, is_primary: false })
    .select("*")
    .single();

  if (error) { res.status(error.code === "23505" ? 409 : 500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// DELETE /:id/instructors/:instructorId — remove instructor
router.delete("/:id/instructors/:instructorId", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { error } = await dbClient
    .from("session_instructors")
    .delete()
    .eq("session_id", req.params.id)
    .eq("instructor_id", req.params.instructorId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ message: "Instructor removed." });
});

// POST /:id/enrollments — enroll student
router.post("/:id/enrollments", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { studentId } = req.body;
  if (!studentId) { res.status(400).json({ error: "studentId required." }); return; }

  // Get session to find level_id
  const { data: session, error: sessionError } = await dbClient
    .from("skating_sessions")
    .select("id, level_id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (sessionError) { res.status(500).json({ error: sessionError.message }); return; }
  if (!session) { res.status(404).json({ error: "Session not found." }); return; }

  const { data: enrollment, error: enrollError } = await dbClient
    .from("enrollments")
    .insert({ session_id: req.params.id, student_id: studentId })
    .select("*")
    .single();

  if (enrollError) { res.status(enrollError.code === "23505" ? 409 : 500).json({ error: enrollError.message }); return; }

  // Seed skill_assessments for all skills in this level
  const { data: skills, error: skillsError } = await dbClient
    .from("skills")
    .select("id")
    .eq("level_id", session.level_id);

  if (skillsError) { res.status(500).json({ error: skillsError.message }); return; }

  if (skills && skills.length > 0) {
    const { error: assessError } = await dbClient.from("skill_assessments").insert(
      skills.map((skill) => ({
        enrollment_id: enrollment.id,
        skill_id: skill.id,
        status: "not_started",
      }))
    );
    if (assessError) { res.status(500).json({ error: assessError.message }); return; }
  }

  res.status(201).json(enrollment);
});

// DELETE /:id/enrollments/:studentId — soft delete
router.delete("/:id/enrollments/:studentId", async (req, res) => {
  const user = await requireUser(req, res, ["admin"]);
  if (!user) return;

  const { error } = await dbClient
    .from("enrollments")
    .update({ dropped_at: new Date().toISOString() })
    .eq("session_id", req.params.id)
    .eq("student_id", req.params.studentId)
    .is("dropped_at", null);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ message: "Student dropped from session." });
});

export default router;
