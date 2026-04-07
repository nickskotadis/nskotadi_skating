import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type Instructor = {
  id: string;
  first_name: string;
  last_name: string;
};

type Enrollment = {
  id: string;
  student_id: string;
  users: { first_name: string; last_name: string };
  dropped_at: string | null;
};

type ClassDate = {
  id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  is_cancelled: boolean;
};

type SessionDetail = {
  id: string;
  name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  season_start: string;
  season_end: string;
  capacity: number;
  skating_levels: { name: string };
  rink_locations: { name: string };
  instructors: Instructor[];
  class_dates: ClassDate[];
  enrollments: Enrollment[];
};

type DbUser = {
  id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
};

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);
  const [allInstructors, setAllInstructors] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [addInstructorId, setAddInstructorId] = useState("");
  const [addingInstructor, setAddingInstructor] = useState(false);

  async function loadSession() {
    try {
      const data = await apiFetch<SessionDetail>(`/api/admin/sessions/${id}`, { token });
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      loadSession(),
      apiFetch<DbUser[]>("/api/admin/users", { token }).then((users) => {
        setAllUsers(users.filter((u) => u.role === "student"));
        setAllInstructors(users.filter((u) => u.role === "instructor"));
      }),
    ]).catch(() => {});
  }, [id, token]);

  async function handleEnroll() {
    if (!enrollStudentId) return;
    setEnrolling(true);
    setError("");
    try {
      await apiFetch(`/api/admin/sessions/${id}/enrollments`, {
        method: "POST",
        token,
        body: JSON.stringify({ studentId: enrollStudentId }),
      });
      setEnrollStudentId("");
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll student.");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleDrop(studentId: string) {
    if (!confirm("Drop this student from the session?")) return;
    try {
      await apiFetch(`/api/admin/sessions/${id}/enrollments/${studentId}`, {
        method: "DELETE",
        token,
      });
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to drop student.");
    }
  }

  async function handleAddInstructor() {
    if (!addInstructorId) return;
    setAddingInstructor(true);
    setError("");
    try {
      await apiFetch(`/api/admin/sessions/${id}/instructors`, {
        method: "POST",
        token,
        body: JSON.stringify({ instructorId: addInstructorId }),
      });
      setAddInstructorId("");
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add instructor.");
    } finally {
      setAddingInstructor(false);
    }
  }

  async function handleRemoveInstructor(instructorId: string) {
    if (!confirm("Remove this instructor from the session?")) return;
    try {
      await apiFetch(`/api/admin/sessions/${id}/instructors/${instructorId}`, {
        method: "DELETE",
        token,
      });
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove instructor.");
    }
  }

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;
  if (!session) return <div className="page-content"><p className="status status--error">Session not found.</p></div>;

  const activeEnrollments = session.enrollments.filter((e) => !e.dropped_at);
  const enrolledStudentIds = new Set(activeEnrollments.map((e) => e.student_id));
  const assignedInstructorIds = new Set(session.instructors.map((i) => i.id));

  const availableStudents = allUsers.filter((u) => !enrolledStudentIds.has(u.id));
  const availableInstructors = allInstructors.filter((u) => !assignedInstructorIds.has(u.id));

  return (
    <div className="page-content">
      <h1 className="page-title">{session.name}</h1>
      <p className="page-subtitle">
        {session.skating_levels?.name} &mdash; {session.rink_locations?.name}
      </p>

      {error && <p className="status status--error">{error}</p>}

      <div className="detail-grid">
        <div className="card">
          <h2 className="card-title">Session Info</h2>
          <dl className="info-list">
            <dt>Day</dt>
            <dd>{session.day_of_week.charAt(0).toUpperCase() + session.day_of_week.slice(1)}</dd>
            <dt>Time</dt>
            <dd>{formatTime(session.start_time)} – {formatTime(session.end_time)}</dd>
            <dt>Season</dt>
            <dd>
              {format(new Date(session.season_start), "MMM d, yyyy")} –{" "}
              {format(new Date(session.season_end), "MMM d, yyyy")}
            </dd>
            <dt>Capacity</dt>
            <dd>{activeEnrollments.length} / {session.capacity}</dd>
          </dl>
        </div>

        <div className="card">
          <h2 className="card-title">Class Dates</h2>
          {session.class_dates.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No class dates yet.</p>
          ) : (
            <ul className="date-list">
              {session.class_dates.map((cd) => (
                <li key={cd.id} className={cd.is_cancelled ? "date-cancelled" : ""}>
                  {format(new Date(cd.class_date), "EEE, MMM d, yyyy")}
                  {cd.is_cancelled && <span className="badge badge--cancelled">Cancelled</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Instructors */}
      <div className="card">
        <h2 className="card-title">Instructors</h2>
        {session.instructors.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No instructors assigned.</p>
        ) : (
          <ul className="roster-list">
            {session.instructors.map((inst) => (
              <li key={inst.id} className="roster-item">
                <span>{inst.first_name} {inst.last_name}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleRemoveInstructor(inst.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {availableInstructors.length > 0 && (
          <div className="inline-form" style={{ marginTop: "0.75rem" }}>
            <select
              className="select-input"
              value={addInstructorId}
              onChange={(e) => setAddInstructorId(e.target.value)}
            >
              <option value="">Select instructor...</option>
              {availableInstructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.first_name} {i.last_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleAddInstructor}
              disabled={!addInstructorId || addingInstructor}
            >
              {addingInstructor ? "Adding..." : "Add Instructor"}
            </button>
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="card">
        <h2 className="card-title">Enrolled Students ({activeEnrollments.length})</h2>
        {activeEnrollments.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No students enrolled.</p>
        ) : (
          <ul className="roster-list">
            {activeEnrollments.map((enr) => (
              <li key={enr.id} className="roster-item">
                <span>{enr.users.first_name} {enr.users.last_name}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleDrop(enr.student_id)}
                >
                  Drop
                </button>
              </li>
            ))}
          </ul>
        )}

        {availableStudents.length > 0 && (
          <div className="inline-form" style={{ marginTop: "0.75rem" }}>
            <select
              className="select-input"
              value={enrollStudentId}
              onChange={(e) => setEnrollStudentId(e.target.value)}
            >
              <option value="">Select student to enroll...</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleEnroll}
              disabled={!enrollStudentId || enrolling}
            >
              {enrolling ? "Enrolling..." : "Enroll"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
