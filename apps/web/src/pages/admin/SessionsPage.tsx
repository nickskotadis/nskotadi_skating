import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type SessionSummary = {
  id: string;
  name: string;
  level_id: string;
  location_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  season_start: string;
  season_end: string;
  capacity: number;
  skating_levels: { name: string };
  rink_locations: { name: string };
  instructors: { id: string; first_name: string; last_name: string }[];
  enrollment_count: number;
};

function formatTime(t: string) {
  // t may be "HH:MM" or "HH:MM:SS"
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SessionsPage() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<SessionSummary[]>("/api/admin/sessions", { token })
      .then(setSessions)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sessions."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="page-subtitle">All skating sessions for the current season</p>
        </div>
        <Link to="/admin/sessions/new" className="btn">+ New Session</Link>
      </div>

      {error && <p className="status status--error">{error}</p>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Level</th>
              <th>Location</th>
              <th>Day / Time</th>
              <th>Season</th>
              <th>Instructors</th>
              <th>Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  No sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/admin/sessions/${s.id}`}>{s.name}</Link>
                  </td>
                  <td>{s.skating_levels?.name ?? "—"}</td>
                  <td>{s.rink_locations?.name ?? "—"}</td>
                  <td>
                    {capitalize(s.day_of_week)}, {formatTime(s.start_time)}–{formatTime(s.end_time)}
                  </td>
                  <td>
                    {format(new Date(s.season_start), "MMM d")}–{format(new Date(s.season_end), "MMM d, yyyy")}
                  </td>
                  <td>{s.instructors?.length ?? 0}</td>
                  <td>{s.enrollment_count} / {s.capacity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
