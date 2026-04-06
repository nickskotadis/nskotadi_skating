import { Router } from "express";
import { z } from "zod";
import {
  authClient,
  dbClient,
  requireUser,
  upsertUser,
} from "../middleware/auth.js";
import type { UserRole } from "../lib/types.js";

const router = Router();

const VALID_ROLES: UserRole[] = ["admin", "instructor", "parent", "student"];

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  role: z.enum(["admin", "instructor", "parent", "student"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid signup payload", details: parsed.error.flatten() });
    return;
  }

  const { email, password, firstName, lastName, role } = parsed.data;
  const assignedRole: UserRole =
    role && VALID_ROLES.includes(role) ? role : "parent";

  const { data, error } = await authClient.auth.signUp({ email, password });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (data.user?.id) {
    const userError = await upsertUser(data.user.id, assignedRole, firstName, lastName);
    if (userError) {
      res.status(500).json({
        error: "Account created but profile could not be saved.",
        details: userError.message,
      });
      return;
    }
  }

  res.status(201).json({
    message:
      "Account created. Check your email if confirmation is required by your Supabase auth settings.",
    userId: data.user?.id ?? null,
    accessToken: data.session?.access_token ?? null,
    role: assignedRole,
    firstName: firstName ?? null,
    lastName: lastName ?? null,
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login payload" });
    return;
  }

  const { data, error } = await authClient.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.session) {
    res.status(401).json({ error: error?.message ?? "Login failed" });
    return;
  }

  const { data: profile, error: profileError } = await dbClient
    .from("users")
    .select("role, first_name, last_name")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    res.status(403).json({ error: "No user role found for this account." });
    return;
  }

  res.json({
    message: "Login successful",
    userId: data.user.id,
    accessToken: data.session.access_token,
    role: profile.role as UserRole,
    firstName: profile.first_name ?? null,
    lastName: profile.last_name ?? null,
  });
});

router.get("/me", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { data, error } = await dbClient
    .from("users")
    .select("id, role, first_name, last_name, phone, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    res.status(500).json({ error: "Could not load user profile." });
    return;
  }

  res.json({
    userId: data.id,
    role: data.role,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
    phone: data.phone ?? null,
    createdAt: data.created_at,
  });
});

export default router;
