import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type SessionOption = {
  id: string;
  name: string;
};

type SkillStatus = "not_started" | "in_progress" | "passed" | "failed";

type StudentCard = {
  enrollmentId: string;
  studentName: string;
  level: string;
  sticker: string;
  personalNote: string;
  skills: { name: string; status: SkillStatus }[];
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

export default function ReportsPage() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [cards, setCards] = useState<StudentCard[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<SessionOption[]>("/api/admin/sessions", { token })
      .then(setSessions)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sessions."))
      .finally(() => setLoadingSessions(false));
  }, [token]);

  async function loadFeedback(sessionId: string) {
    if (!sessionId) {
      setCards([]);
      return;
    }
    setLoadingCards(true);
    setError("");
    try {
      const data = await apiFetch<StudentCard[]>(
        `/api/admin/reports/feedback?sessionId=${sessionId}`,
        { token }
      );
      setCards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report data.");
      setCards([]);
    } finally {
      setLoadingCards(false);
    }
  }

  function handleSessionChange(id: string) {
    setSelectedSessionId(id);
    loadFeedback(id);
  }

  const passedCount = (skills: StudentCard["skills"]) =>
    skills.filter((s) => s.status === "passed").length;

  if (loadingSessions) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Feedback Reports</h1>
          <p className="page-subtitle">Print feedback cards for students</p>
        </div>
        {cards.length > 0 && (
          <button type="button" className="btn print-hide" onClick={() => window.print()}>
            Print Cards
          </button>
        )}
      </div>

      {error && <p className="status status--error">{error}</p>}

      <div className="print-hide" style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="session-select" style={{ marginRight: "0.75rem", fontWeight: 500 }}>
          Select Session:
        </label>
        <select
          id="session-select"
          className="select-input"
          value={selectedSessionId}
          onChange={(e) => handleSessionChange(e.target.value)}
        >
          <option value="">Choose a session...</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loadingCards && <p className="loading-text">Loading cards...</p>}

      {!loadingCards && cards.length === 0 && selectedSessionId && (
        <p style={{ color: "var(--text-muted)" }}>No feedback cards available for this session.</p>
      )}

      <div className="report-cards">
        {cards.map((card) => (
          <div key={card.enrollmentId} className="report-card">
            <div className="report-card-header">
              <div className="report-sticker">{STICKER_MAP[card.sticker] ?? card.sticker}</div>
              <div>
                <h2 className="report-student-name">{card.studentName}</h2>
                <p className="report-level">{card.level}</p>
              </div>
            </div>

            {card.personalNote && (
              <p className="report-note">{card.personalNote}</p>
            )}

            <div className="report-skills">
              <p className="report-skills-summary">
                {passedCount(card.skills)} / {card.skills.length} skills passed
              </p>
              <ul className="skill-checklist">
                {card.skills.map((skill, idx) => (
                  <li key={idx} className={`skill-check skill-check--${skill.status}`}>
                    <span className="skill-check-icon">
                      {skill.status === "passed" ? "✓" : skill.status === "failed" ? "✗" : "○"}
                    </span>
                    {skill.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          .report-cards { display: block; }
          .report-card { page-break-inside: avoid; margin-bottom: 1rem; }
        }
      `}</style>
    </div>
  );
}
