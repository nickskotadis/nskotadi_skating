import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type InstructorSession = {
  id: string;
  name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  skating_levels: { name: string };
  rink_locations: { name: string };
  class_dates_count: number;
};

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MySessionsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<InstructorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<InstructorSession[]>("/api/instructor/sessions", { token })
      .then(setSessions)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sessions."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">My Sessions</h1>
      <p className="page-subtitle">Sessions you are assigned to instruct</p>

      {error && <p className="status status--error">{error}</p>}

      {sessions.length === 0 && !error ? (
        <p style={{ color: "var(--text-muted)" }}>You are not assigned to any sessions.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Level</th>
                <th>Location</th>
                <th>Day / Time</th>
                <th>Class Dates</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.skating_levels?.name ?? "—"}</td>
                  <td>{s.rink_locations?.name ?? "—"}</td>
                  <td>
                    {capitalize(s.day_of_week)}, {formatTime(s.start_time)}–{formatTime(s.end_time)}
                  </td>
                  <td>{s.class_dates_count}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => navigate(`/instructor/attendance/${s.id}`)}
                    >
                      Attendance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
