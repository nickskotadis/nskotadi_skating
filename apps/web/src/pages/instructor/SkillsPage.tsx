import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type Enrollment = {
  id: string;
  student_id: string;
  users: { first_name: string; last_name: string };
};

type SessionWithEnrollments = {
  id: string;
  name: string;
  enrollments: Enrollment[];
};

type SkillAssessment = {
  id: string;
  skill_id: string;
  status: "not_started" | "in_progress" | "passed";
  skills: { name: string; sort_order: number };
};

const STATUS_OPTIONS: SkillAssessment["status"][] = ["not_started", "in_progress", "passed"];

const STATUS_LABELS: Record<SkillAssessment["status"], string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  passed: "Passed",
};

export default function SkillsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { token } = useAuth();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SessionWithEnrollments[]>("/api/instructor/sessions", { token })
      .then((sessions) => {
        const found = sessions.find((s) => s.id === sessionId);
        if (found) {
          setSessionName(found.name);
          const active = (found.enrollments ?? []).filter(
            (e: Enrollment & { dropped_at?: string | null }) => !e.dropped_at
          );
          setEnrollments(active);
          if (active.length > 0) setSelectedEnrollmentId(active[0].id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load session."))
      .finally(() => setLoadingSession(false));
  }, [sessionId, token]);

  useEffect(() => {
    if (!selectedEnrollmentId) return;
    setLoadingSkills(true);
    setAssessments([]);
    apiFetch<SkillAssessment[]>(`/api/instructor/skills/${selectedEnrollmentId}`, { token })
      .then(setAssessments)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load skills."))
      .finally(() => setLoadingSkills(false));
  }, [selectedEnrollmentId, token]);

  async function handleStatusChange(assessmentId: string, status: SkillAssessment["status"]) {
    setUpdating(assessmentId);
    try {
      const updated = await apiFetch<SkillAssessment>(
        `/api/instructor/skills/${assessmentId}`,
        {
          method: "PATCH",
          token,
          body: JSON.stringify({ status }),
        }
      );
      setAssessments((prev) =>
        prev.map((a) => (a.id === assessmentId ? { ...a, status: updated.status } : a))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update skill.");
    } finally {
      setUpdating(null);
    }
  }

  const selectedEnrollment = enrollments.find((e) => e.id === selectedEnrollmentId);

  if (loadingSession) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Skills Assessment</h1>
      <p className="page-subtitle">{sessionName}</p>

      {error && <p className="status status--error">{error}</p>}

      {enrollments.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No enrolled students.</p>
      ) : (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="student-select" style={{ marginRight: "0.75rem", fontWeight: 500 }}>
              Student:
            </label>
            <select
              id="student-select"
              className="select-input"
              value={selectedEnrollmentId}
              onChange={(e) => setSelectedEnrollmentId(e.target.value)}
            >
              {enrollments.map((enr) => (
                <option key={enr.id} value={enr.id}>
                  {enr.users.first_name} {enr.users.last_name}
                </option>
              ))}
            </select>
          </div>

          {loadingSkills && <p className="loading-text">Loading skills...</p>}

          {!loadingSkills && assessments.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>No skills found for this enrollment.</p>
          )}

          {!loadingSkills && assessments.length > 0 && (
            <div className="card">
              <h2 className="card-title">
                Skills for {selectedEnrollment?.users.first_name} {selectedEnrollment?.users.last_name}
              </h2>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Skill</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments
                      .sort((a, b) => a.skills.sort_order - b.skills.sort_order)
                      .map((a) => (
                        <tr key={a.id}>
                          <td>{a.skills.sort_order}</td>
                          <td>{a.skills.name}</td>
                          <td>
                            <select
                              className="select-input"
                              value={a.status}
                              disabled={updating === a.id}
                              onChange={(e) =>
                                handleStatusChange(a.id, e.target.value as SkillAssessment["status"])
                              }
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
