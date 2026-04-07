import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_PUBLISHABLE_KEY ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    "Missing Supabase configuration. Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY."
  );
}

import authRouter from "./routers/auth.js";
import adminUsersRouter from "./routers/admin/users.js";
import adminLevelsRouter from "./routers/admin/levels.js";
import adminLocationsRouter from "./routers/admin/locations.js";
import adminSessionsRouter from "./routers/admin/sessions.js";
import adminMakeupsRouter from "./routers/admin/makeups.js";
import adminRatingsRouter from "./routers/admin/ratings.js";
import adminReportsRouter from "./routers/admin/reports.js";
import adminIceShowsRouter from "./routers/admin/ice-shows.js";
import instructorSessionsRouter from "./routers/instructor/sessions.js";
import instructorAttendanceRouter from "./routers/instructor/attendance.js";
import instructorSkillsRouter from "./routers/instructor/skills.js";
import instructorFeedbackRouter from "./routers/instructor/feedback.js";
import studentScheduleRouter from "./routers/student/schedule.js";
import studentSkillsRouter from "./routers/student/skills.js";
import studentFeedbackRouter from "./routers/student/feedback.js";
import parentChildrenRouter from "./routers/parent/children.js";
import parentScheduleRouter from "./routers/parent/schedule.js";
import parentRatingsRouter from "./routers/parent/ratings.js";
import parentCalendarRouter from "./routers/parent/calendar.js";
import sharedCalendarRouter from "./routers/shared/calendar.js";

const port = Number(process.env.PORT ?? 4000);
const corsOriginsRaw =
  process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";
const allowedOrigins = corsOriginsRaw
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRouter);

// Admin
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/levels", adminLevelsRouter);
app.use("/api/admin/locations", adminLocationsRouter);
app.use("/api/admin/sessions", adminSessionsRouter);
app.use("/api/admin/makeups", adminMakeupsRouter);
app.use("/api/admin/ratings", adminRatingsRouter);
app.use("/api/admin/reports", adminReportsRouter);
app.use("/api/admin/ice-shows", adminIceShowsRouter);

// Instructor
app.use("/api/instructor/sessions", instructorSessionsRouter);
app.use("/api/instructor/attendance", instructorAttendanceRouter);
app.use("/api/instructor/skills", instructorSkillsRouter);
app.use("/api/instructor/feedback", instructorFeedbackRouter);

// Student
app.use("/api/student/schedule", studentScheduleRouter);
app.use("/api/student/skills", studentSkillsRouter);
app.use("/api/student/feedback", studentFeedbackRouter);

// Parent
app.use("/api/parent/children", parentChildrenRouter);
app.use("/api/parent/schedule", parentScheduleRouter);
app.use("/api/parent/ratings", parentRatingsRouter);
app.use("/api/parent/calendar", parentCalendarRouter);

// Shared (unauthenticated calendar feed)
app.use("/api/calendar", sharedCalendarRouter);

app.listen(port, () => {
  console.log(`SkateTrack API listening on port ${port}`);
});
