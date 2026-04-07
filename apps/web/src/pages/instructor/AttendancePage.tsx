import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type ClassDate = {
  id: string;
  class_date: string;
  start_time: string;
  end_time: string;
};

type SessionWithDates = {
  id: string;
  name: string;
  class_dates: ClassDate[];
};

type AttendanceRecord = {
  studentId: string;
  name: string;
  currentStatus: "present" | "absent" | "makeup" | null;
};

export default function AttendancePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { token } = useAuth();

  const [session, setSession] = useState<SessionWithDates | null>(null);
  const [selectedDateId, setSelectedDateId] = useState("");
  const [roster, setRoster] = useState<AttendanceRecord[]>([]);
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent" | "makeup">>({});
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    apiFetch<SessionWithDates[]>("/api/instructor/sessions", { token })
      .then((sessions) => {
        const found = sessions.find((s) => s.id === sessionId) ?? null;
        setSession(found);
        if (found?.class_dates?.length) {
          // default to most recent past or today date
          const today = new Date().toISOString().split("T")[0];
          const past = found.class_dates.filter((d) => d.class_date <= today);
          const latest = past.length > 0 ? past[past.length - 1] : found.class_dates[0];
          setSelectedDateId(latest.id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load session."))
      .finally(() => setLoadingSession(false));
  }, [sessionId, token]);

  useEffect(() => {
    if (!selectedDateId) return;
    setLoadingRoster(true);
    setRoster([]);
    setAttendance({});
    apiFetch<AttendanceRecord[]>(`/api/instructor/attendance/${selectedDateId}`, { token })
      .then((data) => {
        setRoster(data);
        const init: Record<string, "present" | "absent" | "makeup"> = {};
        data.forEach((r) => {
          if (r.currentStatus) init[r.studentId] = r.currentStatus;
        });
        setAttendance(init);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load roster."))
      .finally(() => setLoadingRoster(false));
  }, [selectedDateId, token]);

  function setStatus(studentId: string, status: "present" | "absent" | "makeup") {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      await apiFetch(`/api/instructor/attendance/${selectedDateId}`, {
        method: "POST",
        token,
        body: JSON.stringify({
          attendance: Object.entries(attendance).map(([studentId, status]) => ({
            studentId,
            status,
          })),
        }),
      });
      setSuccessMsg("Attendance saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save attendance.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  if (!session) {
    return (
      <div className="page-content">
        <p className="status status--error">Session not found.</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h1 className="page-title">Attendance</h1>
      <p className="page-subtitle">{session.name}</p>

      {error && <p className="status status--error">{error}</p>}
      {successMsg && <p className="status status--success">{successMsg}</p>}

      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="date-select" style={{ marginRight: "0.75rem", fontWeight: 500 }}>
          Class Date:
        </label>
        <select
          id="date-select"
          className="select-input"
          value={selectedDateId}
          onChange={(e) => setSelectedDateId(e.target.value)}
        >
          {(session.class_dates ?? []).map((cd) => (
            <option key={cd.id} value={cd.id}>
              {format(new Date(cd.class_date), "EEE, MMM d, yyyy")}
            </option>
          ))}
        </select>
      </div>

      {loadingRoster && <p className="loading-text">Loading roster...</p>}

      {!loadingRoster && roster.length === 0 && selectedDateId && (
        <p style={{ color: "var(--text-muted)" }}>No students enrolled.</p>
      )}

      {!loadingRoster && roster.length > 0 && (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((student) => (
                  <tr key={student.studentId}>
                    <td>{student.name}</td>
                    <td>
                      <div className="attendance-toggle">
                        {(["present", "absent", "makeup"] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`btn btn-sm attendance-btn attendance-btn--${s}${attendance[student.studentId] === s ? " attendance-btn--active" : ""}`}
                            onClick={() => setStatus(student.studentId, s)}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <button
              type="button"
              className="btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
