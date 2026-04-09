import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type Child = {
  id: string;
  first_name: string;
  last_name: string;
};

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

export default function ChildSchedulePage() {
  const { token } = useAuth();

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Child[]>("/api/parent/children", { token })
      .then((data) => {
        setChildren(data);
        if (data.length > 0) setSelectedChildId(data[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load children."))
      .finally(() => setLoadingChildren(false));
  }, [token]);

  useEffect(() => {
    if (!selectedChildId) return;
    setLoadingSchedule(true);
    setSchedule([]);
    apiFetch<ScheduleEntry[]>(`/api/parent/schedule?childId=${selectedChildId}`, { token })
      .then(setSchedule)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load schedule."))
      .finally(() => setLoadingSchedule(false));
  }, [selectedChildId, token]);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  if (loadingChildren) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Child Schedule</h1>
      <p className="page-subtitle">View upcoming classes for your children</p>

      {error && <p className="status status--error">{error}</p>}

      {children.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No children linked to your account.</p>
      ) : (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="child-select" style={{ marginRight: "0.75rem", fontWeight: 500 }}>
              Child:
            </label>
            <select
              id="child-select"
              className="select-input"
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          {selectedChild && (
            <h2 style={{ marginBottom: "1rem" }}>
              {selectedChild.first_name} {selectedChild.last_name}'s Schedule
            </h2>
          )}

          {loadingSchedule && <p className="loading-text">Loading schedule...</p>}

          {!loadingSchedule && schedule.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>No upcoming sessions for this child.</p>
          )}

          <div className="schedule-list">
            {schedule.map((entry) => (
              <div key={entry.session.id} className="card schedule-card">
                <div className="schedule-card-header">
                  <div>
                    <h3 className="card-title">{entry.session.name}</h3>
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
        </>
      )}
    </div>
  );
}
