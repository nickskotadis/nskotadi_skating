import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type MissedDate = { id: string; class_date: string; start_time: string; end_time: string };
type MakeupDate = { id: string; class_date: string; start_time: string; end_time: string } | null;

type MakeupRequest = {
  id: string;
  status: "pending" | "scheduled" | "completed" | "waived";
  missed_date: MissedDate | null;
  makeup_date: MakeupDate;
  enrollments: {
    id: string;
    users: { first_name: string; last_name: string };
    skating_sessions: { id: string; name: string; level_id?: string };
  } | null;
};

type AvailableDate = {
  id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  session_name: string;
};

const STATUS_OPTIONS = ["pending", "scheduled", "completed", "waived"] as const;

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

export default function MakeupsPage() {
  const { token } = useAuth();
  const [makeups, setMakeups] = useState<MakeupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Makeup date assignment state
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedDateId, setSelectedDateId] = useState("");
  const [loadingDates, setLoadingDates] = useState(false);

  useEffect(() => {
    apiFetch<MakeupRequest[]>("/api/admin/makeups", { token })
      .then(setMakeups)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load makeups."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleStatusChange(id: string, status: string) {
    setUpdating(id);
    try {
      await apiFetch<MakeupRequest>(`/api/admin/makeups/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status }),
      });
      setMakeups((prev) => prev.map((m) => m.id === id ? { ...m, status: status as MakeupRequest["status"] } : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdating(null);
    }
  }

  async function openAssign(makeup: MakeupRequest) {
    setAssigningId(makeup.id);
    setSelectedDateId("");
    setAvailableDates([]);
    setLoadingDates(true);

    // Need level_id — fetch the session to get it
    const sessionId = makeup.enrollments?.skating_sessions?.id;
    if (!sessionId) { setLoadingDates(false); return; }

    try {
      const session = await apiFetch<{ level_id: string }>(`/api/admin/sessions/${sessionId}`, { token });
      const dates = await apiFetch<AvailableDate[]>(
        `/api/admin/sessions/class-dates?levelId=${session.level_id}`,
        { token }
      );
      setAvailableDates(dates);
      if (dates.length > 0) setSelectedDateId(dates[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load available dates.");
    } finally {
      setLoadingDates(false);
    }
  }

  async function handleAssignDate(makeupId: string) {
    if (!selectedDateId) return;
    setUpdating(makeupId);
    try {
      const updated = await apiFetch<MakeupRequest>(`/api/admin/makeups/${makeupId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status: "scheduled", makeupDateId: selectedDateId }),
      });
      // Refresh the full list to get nested makeup_date object
      const refreshed = await apiFetch<MakeupRequest[]>("/api/admin/makeups", { token });
      setMakeups(refreshed);
      setAssigningId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign makeup date.");
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {makeups.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  No makeup requests.
                </td>
              </tr>
            ) : (
              makeups.map((m) => (
                <>
                  <tr key={m.id}>
                    <td>
                      {m.enrollments?.users
                        ? `${m.enrollments.users.first_name} ${m.enrollments.users.last_name}`
                        : "—"}
                    </td>
                    <td>{m.enrollments?.skating_sessions?.name ?? "—"}</td>
                    <td>
                      {m.missed_date
                        ? `${format(new Date(m.missed_date.class_date), "MMM d, yyyy")} ${formatTime(m.missed_date.start_time)}`
                        : "—"}
                    </td>
                    <td>
                      {m.makeup_date
                        ? `${format(new Date(m.makeup_date.class_date), "MMM d, yyyy")} ${formatTime(m.makeup_date.start_time)}`
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
                    <td>
                      {m.status === "pending" && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => assigningId === m.id ? setAssigningId(null) : openAssign(m)}
                        >
                          {assigningId === m.id ? "Cancel" : "Assign Date"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {assigningId === m.id && (
                    <tr key={`${m.id}-assign`}>
                      <td colSpan={6} style={{ background: "var(--bg-subtle, #f8fafc)", padding: "1rem" }}>
                        {loadingDates ? (
                          <p className="loading-text">Loading available dates...</p>
                        ) : availableDates.length === 0 ? (
                          <p style={{ color: "var(--text-muted)" }}>No upcoming class dates available for this level.</p>
                        ) : (
                          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                            <label style={{ fontWeight: 500 }}>Assign to:</label>
                            <select
                              className="select-input"
                              value={selectedDateId}
                              onChange={(e) => setSelectedDateId(e.target.value)}
                            >
                              {availableDates.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.session_name} — {format(new Date(d.class_date), "EEE, MMM d, yyyy")} {formatTime(d.start_time)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn"
                              disabled={!selectedDateId || updating === m.id}
                              onClick={() => handleAssignDate(m.id)}
                            >
                              {updating === m.id ? "Saving..." : "Confirm"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
