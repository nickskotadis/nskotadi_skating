import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type Child = {
  id: string;
  first_name: string;
  last_name: string;
};

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

export default function ChildSkillsPage() {
  const { token } = useAuth();

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [enrollments, setEnrollments] = useState<ScheduleEntry[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
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
    setLoadingEnrollments(true);
    setEnrollments([]);
    setSelectedEnrollmentId("");
    setAssessments([]);
    apiFetch<ScheduleEntry[]>(`/api/parent/schedule?childId=${selectedChildId}`, { token })
      .then((schedule) => {
        setEnrollments(schedule);
        if (schedule.length > 0) setSelectedEnrollmentId(schedule[0].enrollment_id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load enrollments."))
      .finally(() => setLoadingEnrollments(false));
  }, [selectedChildId, token]);

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

  if (loadingChildren) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Child Skills</h1>
      <p className="page-subtitle">View your child's skill progress</p>

      {error && <p className="status status--error">{error}</p>}

      {children.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No children linked to your account.</p>
      ) : (
        <>
          <div className="filter-row" style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <div>
              <label htmlFor="child-select" style={{ marginRight: "0.5rem", fontWeight: 500 }}>
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

            {enrollments.length > 0 && (
              <div>
                <label htmlFor="enrollment-select" style={{ marginRight: "0.5rem", fontWeight: 500 }}>
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
            )}
          </div>

          {loadingEnrollments && <p className="loading-text">Loading enrollments...</p>}

          {!loadingEnrollments && enrollments.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>No active enrollments for this child.</p>
          )}

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
                        style={{ backgroundColor: STATUS_COLORS[a.status], color: "#fff" }}
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
