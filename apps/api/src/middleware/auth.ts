import "dotenv/config";
import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import type { AuthenticatedUser, UserRole } from "../lib/types.js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const authClient = createClient(supabaseUrl, supabasePublishableKey);
export const dbClient = createClient(supabaseUrl, supabaseServiceRoleKey);

const VALID_ROLES: UserRole[] = ["admin", "instructor", "parent", "student"];

export function readBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function fetchUser(userId: string): Promise<AuthenticatedUser | null> {
  const { data, error } = await dbClient
    .from("users")
    .select("id, role, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  if (!VALID_ROLES.includes(data.role)) return null;

  return {
    id: data.id,
    role: data.role as UserRole,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
  };
}

export async function requireUser(
  request: Request,
  response: Response,
  allowedRoles?: UserRole[]
): Promise<AuthenticatedUser | null> {
  const token = readBearerToken(request);

  if (!token) {
    response.status(401).json({ error: "Missing Bearer token" });
    return null;
  }

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    response.status(401).json({ error: "Invalid or expired token" });
    return null;
  }

  const user = await fetchUser(data.user.id);
  if (!user) {
    response.status(403).json({ error: "No user role found for this account." });
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    response.status(403).json({ error: "Insufficient role permissions." });
    return null;
  }

  return user;
}

export async function upsertUser(
  userId: string,
  role: UserRole,
  firstName?: string,
  lastName?: string
) {
  const { error } = await dbClient.from("users").upsert(
    {
      id: userId,
      role,
      first_name: firstName ?? null,
      last_name: lastName ?? null,
    },
    { onConflict: "id" }
  );
  return error;
}
