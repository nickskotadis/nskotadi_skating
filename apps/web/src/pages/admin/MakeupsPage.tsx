import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type MakeupRequest = {
  id: string;
  status: "pending" | "scheduled" | "completed" | "waived";
  missed_class_date: string;
  makeup_class_date: string | null;
  users: { first_name: string; last_name: string };
  sessions: { name: string };
};

const STATUS_OPTIONS = ["pending", "scheduled", "completed", "waived"] as const;

export default function MakeupsPage() {
  const { token } = useAuth();
  const [makeups, setMakeups] = useState<MakeupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MakeupRequest[]>("/api/admin/makeups", { token })
      .then(setMakeups)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load makeups."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleStatusChange(id: string, status: string) {
    setUpdating(id);
    try {
      const updated = await apiFetch<MakeupRequest>(`/api/admin/makeups/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status }),
      });
      setMakeups((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Makeup Requests</h1>
      <p className="page-subtitle">Review and manage student makeup requests</p>

      {error && <p className="status status--error">{error}</p>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Session</th>
              <th>Missed Date</th>
              <th>Makeup Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {makeups.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  No makeup requests.
                </td>
              </tr>
            ) : (
              makeups.map((m) => (
                <tr key={m.id}>
                  <td>{m.users.first_name} {m.users.last_name}</td>
                  <td>{m.sessions.name}</td>
                  <td>{format(new Date(m.missed_class_date), "MMM d, yyyy")}</td>
                  <td>
                    {m.makeup_class_date
                      ? format(new Date(m.makeup_class_date), "MMM d, yyyy")
                      : "—"}
                  </td>
                  <td>
                    <select
                      className="select-input"
                      value={m.status}
                      disabled={updating === m.id}
                      onChange={(e) => handleStatusChange(m.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
