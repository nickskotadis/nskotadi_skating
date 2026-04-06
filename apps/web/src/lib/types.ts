export type UserRole = "admin" | "instructor" | "parent" | "student";

export type User = {
  userId: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
  createdAt?: string;
};

export type DbUser = {
  id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
};

export type SkatingLevel = {
  id: string;
  name: string;
  sort_order: number;
  description: string | null;
  created_at: string;
};

export type Skill = {
  id: string;
  level_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};

export type ApiError = {
  error: string;
  details?: unknown;
};
