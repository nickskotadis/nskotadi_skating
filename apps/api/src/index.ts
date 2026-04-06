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
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/levels", adminLevelsRouter);

app.listen(port, () => {
  console.log(`SkateTrack API listening on port ${port}`);
});
