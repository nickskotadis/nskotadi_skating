import { Router } from "express";
import { z } from "zod";
import { dbClient, requireUser } from "../../middleware/auth.js";

const router = Router();

// GET /:classDateId — roster for a class date with attendance status
router.get("/:classDateId", async (req, res) => {
  const user = await requireUser(req, res, ["instructor"]);
  if (!user) return;

  const { classDateId } = req.params;

  // Get class date + session info
  const { data: classDate, error: cdError } = await dbClient
    .from("class_dates")
    .select("id, session_id, class_date, start_time, end_time, is_cancelled")
    .eq("id", classDateId)
    .maybeSingle();

  if (cdError) { res.status(500).json({ error: cdError.message }); return; }
  if (!classDate) { res.status(404).json({ error: "Class date not found." }); return; }

  // Get enrollments for this session (active only)
  const { data: enrollments, error: enrollError } = await dbClient
    .from("enrollments")
    .select("id, student_id, users(id, first_name, last_name)")
    .eq("session_id", classDate.session_id)
    .is("dropped_at", null);

  if (enrollError) { res.status(500).json({ error: enrollError.message }); return; }

  // Get existing attendance for this class date
  const { data: attendanceRows, error: attError } = await dbClient
    .from("attendance")
    .select("student_id, status")
    .eq("class_date_id", classDateId);

  if (attError) { res.status(500).json({ error: attError.message }); return; }

  const attendanceMap = new Map(
    (attendanceRows ?? []).map((a: any) => [a.student_id, a.status])
  );

  const roster = (enrollments ?? []).map((e: any) => ({
    enrollmentId: e.id,
    student: e.users,
    attendanceStatus: attendanceMap.get(e.student_id) ?? null,
  }));

  res.json({ classDate, roster });
});

const attendanceSchema = z.object({
  records: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: z.enum(["present", "absent", "makeup"]),
    })
  ).min(1),
});

// POST /:classDateId — upsert attendance
router.post("/:classDateId", async (req, res) => {
  const user = await requireUser(req, res, ["instructor"]);
  if (!user) return;

  const parsed = attendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { classDateId } = req.params;

  // Verify class date exists and get session_id
  const { data: classDate, error: cdError } = await dbClient
    .from("class_dates")
    .select("id, session_id")
    .eq("id", classDateId)
    .maybeSingle();

  if (cdError) { res.status(500).json({ error: cdError.message }); return; }
  if (!classDate) { res.status(404).json({ error: "Class date not found." }); return; }

  const upsertRows = parsed.data.records.map((r) => ({
    class_date_id: classDateId,
    student_id: r.studentId,
    status: r.status,
    marked_by: user.id,
  }));

  const { error: upsertError } = await dbClient
    .from("attendance")
    .upsert(upsertRows, { onConflict: "class_date_id,student_id" });

  if (upsertError) { res.status(500).json({ error: upsertError.message }); return; }

  // For absent students, create makeup_requests if none exist
  const absentStudents = parsed.data.records.filter((r) => r.status === "absent");

  for (const record of absentStudents) {
    // Find enrollment
    const { data: enrollment } = await dbClient
      .from("enrollments")
      .select("id")
      .eq("session_id", classDate.session_id)
      .eq("student_id", record.studentId)
      .is("dropped_at", null)
      .maybeSingle();

    if (!enrollment) continue;

    // Check for existing makeup request
    const { data: existing } = await dbClient
      .from("makeup_requests")
      .select("id")
      .eq("enrollment_id", enrollment.id)
      .eq("missed_date_id", classDateId)
      .maybeSingle();

    if (!existing) {
      await dbClient.from("makeup_requests").insert({
        enrollment_id: enrollment.id,
        missed_date_id: classDateId,
        status: "pending",
      });
    }
  }

  // Mark class date as having attendance taken (no is_attendance_taken column — skip)
  res.json({ message: "Attendance recorded." });
});

export default router;
