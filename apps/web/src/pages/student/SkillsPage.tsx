import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type ScheduleEntry = {
  session: { id: string; name: string };
  enrollment_id: string;
};

type SkillAssessment = {
  id: string;
  status: "not_started" | "in_progress" | "passed";
  skills: { name: string; sort_order: number };
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "#9ca3af",
  in_progress: "#f59e0b",
  passed: "#22c55e",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  passed: "Passed",
};

export default function StudentSkillsPage() {
  const { token } = useAuth();

  const [enrollments, setEnrollments] = useState<ScheduleEntry[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<ScheduleEntry[]>("/api/student/schedule", { token })
      .then((schedule) => {
        setEnrollments(schedule);
        if (schedule.length > 0) {
          setSelectedEnrollmentId(schedule[0].enrollment_id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load enrollments."))
      .finally(() => setLoadingEnrollments(false));
  }, [token]);

  useEffect(() => {
    if (!selectedEnrollmentId) return;
    setLoadingSkills(true);
    setAssessments([]);
    apiFetch<SkillAssessment[]>(`/api/student/skills/${selectedEnrollmentId}`, { token })
      .then(setAssessments)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load skills."))
      .finally(() => setLoadingSkills(false));
  }, [selectedEnrollmentId, token]);

  const passed = assessments.filter((a) => a.status === "passed").length;

  if (loadingEnrollments) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">My Skills</h1>
      <p className="page-subtitle">Track your skill progress by session</p>

      {error && <p className="status status--error">{error}</p>}

      {enrollments.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No active enrollments.</p>
      ) : (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="enrollment-select" style={{ marginRight: "0.75rem", fontWeight: 500 }}>
              Session:
            </label>
            <select
              id="enrollment-select"
              className="select-input"
              value={selectedEnrollmentId}
              onChange={(e) => setSelectedEnrollmentId(e.target.value)}
            >
              {enrollments.map((e) => (
                <option key={e.enrollment_id} value={e.enrollment_id}>
                  {e.session.name}
                </option>
              ))}
            </select>
          </div>

          {loadingSkills && <p className="loading-text">Loading skills...</p>}

          {!loadingSkills && assessments.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 className="card-title" style={{ margin: 0 }}>Skill Progress</h2>
                <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  {passed} / {assessments.length} passed
                </span>
              </div>

              <div className="skill-grid">
                {assessments
                  .sort((a, b) => a.skills.sort_order - b.skills.sort_order)
                  .map((a) => (
                    <div key={a.id} className="skill-grid-item">
                      <span className="skill-name">{a.skills.name}</span>
                      <span
                        className="role-badge"
                        style={{
                          backgroundColor: STATUS_COLORS[a.status],
                          color: "#fff",
                        }}
                      >
                        {STATUS_LABELS[a.status]}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {!loadingSkills && assessments.length === 0 && selectedEnrollmentId && (
            <p style={{ color: "var(--text-muted)" }}>No skills tracked for this enrollment yet.</p>
          )}
        </>
      )}
    </div>
  );
}
