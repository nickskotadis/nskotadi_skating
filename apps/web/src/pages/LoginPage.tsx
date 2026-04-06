import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";
import type { UserRole } from "../lib/types";

type AuthMode = "signup" | "login";

type AuthResponse = {
  accessToken: string | null;
  userId: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  message?: string;
};

const ROLE_DASHBOARD: Record<UserRole, string> = {
  admin: "/admin",
  instructor: "/instructor",
  parent: "/parent",
  student: "/student",
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole>("parent");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body =
        mode === "signup"
          ? { email, password, firstName, lastName, role }
          : { email, password };

      const data = await apiFetch<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!data.accessToken) {
        setStatus(data.message ?? "Check your email to confirm your account, then log in.");
        setLoading(false);
        return;
      }

      login(data.accessToken, {
        userId: data.userId,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      navigate(ROLE_DASHBOARD[data.role]);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="panel login-panel">
        <header className="panel-header">
          <div>
            <h1>⛸ SkateTrack</h1>
            <p>Skating School Management System</p>
          </div>
        </header>

        <div className="toggle-row">
          <button
            type="button"
            className={mode === "login" ? "active" : "ghost"}
            onClick={() => { setMode("login"); setStatus(""); }}
          >
            Log In
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : "ghost"}
            onClick={() => { setMode("signup"); setStatus(""); }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          {mode === "signup" && (
            <>
              <div className="split">
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label className="field-label">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="select-input"
                >
                  <option value="parent">Parent</option>
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </>
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "signup"
                ? "Create Account"
                : "Log In"}
          </button>
        </form>

        {status && <p className="status">{status}</p>}
      </section>
    </main>
  );
}
