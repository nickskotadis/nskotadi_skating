export type UserRole = "admin" | "instructor" | "parent" | "student";

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
};

export type DbUser = {
  id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  calendar_token: string;
  created_at: string;
};
