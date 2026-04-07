import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

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

export default function StudentFeedbackPage() {
  const { token } = useAuth();

  const [enrollments, setEnrollments] = useState<ScheduleEntry[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
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

  const selectedSession = enrollments.find((e) => e.enrollment_id === selectedEnrollmentId);

  if (loadingEnrollments) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">My Feedback Cards</h1>
      <p className="page-subtitle">Feedback from your instructor</p>

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

          {loadingFeedback && <p className="loading-text">Loading feedback...</p>}

          {!loadingFeedback && !feedback && (
            <p style={{ color: "var(--text-muted)" }}>
              No published feedback yet for {selectedSession?.session.name ?? "this session"}.
            </p>
          )}

          {!loadingFeedback && feedback && (
            <div className="card feedback-card">
              <div className="feedback-sticker">
                {STICKER_MAP[feedback.sticker] ?? feedback.sticker}
              </div>

              {feedback.personal_note && (
                <p className="feedback-note">{feedback.personal_note}</p>
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
