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

type FeedbackData = {
  enrollment_id: string;
  personal_note: string;
  sticker: string;
  published: boolean;
  skill_summary?: { passed: number; total: number };
};

const STICKER_MAP: Record<string, string> = {
  star: "⭐",
  heart: "❤️",
  trophy: "🏆",
  snowflake: "❄️",
  crown: "👑",
  rainbow: "🌈",
  lightning: "⚡",
};

export default function ChildFeedbackPage() {
  const { token } = useAuth();

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [enrollments, setEnrollments] = useState<ScheduleEntry[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
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
    setFeedback(null);
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
    setLoadingFeedback(true);
    setFeedback(null);
    apiFetch<FeedbackData>(`/api/student/feedback/${selectedEnrollmentId}`, { token })
      .then((data) => {
        if (data?.published) setFeedback(data);
        else setFeedback(null);
      })
      .catch(() => setFeedback(null))
      .finally(() => setLoadingFeedback(false));
  }, [selectedEnrollmentId, token]);

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const selectedSession = enrollments.find((e) => e.enrollment_id === selectedEnrollmentId);

  if (loadingChildren) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Child Feedback</h1>
      <p className="page-subtitle">Published feedback cards from the instructor</p>

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

          {loadingFeedback && <p className="loading-text">Loading feedback...</p>}

          {!loadingFeedback && !feedback && selectedEnrollmentId && (
            <p style={{ color: "var(--text-muted)" }}>
              No published feedback yet for {selectedChild?.first_name} in{" "}
              {selectedSession?.session.name ?? "this session"}.
            </p>
          )}

          {!loadingFeedback && feedback && (
            <div className="card feedback-card">
              {selectedChild && (
                <p style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
                  {selectedChild.first_name} {selectedChild.last_name}
                </p>
              )}

              <div className="feedback-sticker" style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
                {STICKER_MAP[feedback.sticker] ?? feedback.sticker}
              </div>

              {feedback.personal_note && (
                <p className="feedback-note" style={{ marginBottom: "0.75rem" }}>
                  {feedback.personal_note}
                </p>
              )}

              {feedback.skill_summary && (
                <div className="feedback-summary">
                  <span className="role-badge" style={{ backgroundColor: "#22c55e", color: "#fff" }}>
                    {feedback.skill_summary.passed} / {feedback.skill_summary.total} skills passed
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
