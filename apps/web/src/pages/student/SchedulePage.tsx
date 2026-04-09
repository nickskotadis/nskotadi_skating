import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type ClassDate = {
  id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  is_cancelled: boolean;
};

type SessionInfo = {
  id: string;
  name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  skating_levels: { name: string };
  rink_locations: { name: string; color_hex: string | null };
};

type ScheduleEntry = {
  session: SessionInfo;
  upcoming_dates: ClassDate[];
};

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

export default function SchedulePage() {
  const { token } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<ScheduleEntry[]>("/api/student/schedule", { token })
      .then(setSchedule)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load schedule."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">My Schedule</h1>
      <p className="page-subtitle">Upcoming class dates for your enrolled sessions</p>

      {error && <p className="status status--error">{error}</p>}

      {schedule.length === 0 && !error ? (
        <p style={{ color: "var(--text-muted)" }}>You are not enrolled in any sessions.</p>
      ) : (
        <div className="schedule-list">
          {schedule.map((entry) => (
            <div key={entry.session.id} className="card schedule-card">
              <div className="schedule-card-header">
                <div>
                  <h2 className="card-title">{entry.session.name}</h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {entry.session.skating_levels?.name} &mdash;
                    {entry.session.rink_locations?.color_hex && (
                      <span
                        style={{
                          display: "inline-block",
                          width: "0.75rem",
                          height: "0.75rem",
                          borderRadius: "50%",
                          background: entry.session.rink_locations.color_hex,
                          border: "1px solid rgba(0,0,0,0.15)",
                        }}
                      />
                    )}
                    {entry.session.rink_locations?.name}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
                    {entry.session.day_of_week.charAt(0).toUpperCase() + entry.session.day_of_week.slice(1)},{" "}
                    {formatTime(entry.session.start_time)}–{formatTime(entry.session.end_time)}
                  </p>
                </div>
              </div>

              {entry.upcoming_dates.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  No upcoming class dates.
                </p>
              ) : (
                <ul className="date-list" style={{ marginTop: "0.75rem" }}>
                  {entry.upcoming_dates.map((cd) => (
                    <li
                      key={cd.id}
                      className={cd.is_cancelled ? "date-cancelled" : ""}
                      style={{ padding: "0.25rem 0" }}
                    >
                      {format(new Date(cd.class_date), "EEE, MMM d, yyyy")}
                      {cd.start_time && (
                        <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)" }}>
                          {formatTime(cd.start_time)}–{formatTime(cd.end_time)}
                        </span>
                      )}
                      {cd.is_cancelled && (
                        <span className="badge badge--cancelled" style={{ marginLeft: "0.5rem" }}>
                          Cancelled
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
