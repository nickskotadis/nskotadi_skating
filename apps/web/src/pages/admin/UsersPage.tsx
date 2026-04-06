import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";
import type { DbUser, UserRole } from "../../lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  instructor: "Instructor",
  parent: "Parent",
  student: "Student",
};

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function loadUsers() {
    try {
      const data = await apiFetch<DbUser[]>("/api/admin/users", { token });
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [token]);

  async function updateRole(userId: string, role: UserRole) {
    setSaving(userId);
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ role }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="page-content"><p className="loading-text">Loading users...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Users</h1>
      <p className="page-subtitle">{users.length} accounts registered</p>

      {error && <p className="status status--error">{error}</p>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="user-cell">
                    <span className="user-name">
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`role-badge role-badge--${u.role}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={saving === u.id}
                    onChange={(e) => updateRole(u.id, e.target.value as UserRole)}
                    className="select-input select-input--sm"
                  >
                    <option value="admin">Admin</option>
                    <option value="instructor">Instructor</option>
                    <option value="parent">Parent</option>
                    <option value="student">Student</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
