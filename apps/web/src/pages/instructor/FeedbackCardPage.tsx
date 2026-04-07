import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type FeedbackData = {
  id?: string;
  enrollment_id: string;
  personal_note: string;
  sticker: string;
  published: boolean;
};

const STICKER_OPTIONS = [
  { key: "star", emoji: "⭐" },
  { key: "heart", emoji: "❤️" },
  { key: "trophy", emoji: "🏆" },
  { key: "snowflake", emoji: "❄️" },
  { key: "crown", emoji: "👑" },
  { key: "rainbow", emoji: "🌈" },
  { key: "lightning", emoji: "⚡" },
];

export default function FeedbackCardPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const { token } = useAuth();

  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [note, setNote] = useState("");
  const [sticker, setSticker] = useState("star");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    apiFetch<FeedbackData>(`/api/instructor/feedback/${enrollmentId}`, { token })
      .then((data) => {
        setFeedback(data);
        setNote(data.personal_note ?? "");
        setSticker(data.sticker ?? "star");
      })
      .catch(() => {
        // No existing feedback — start fresh
        setNote("");
        setSticker("star");
      })
      .finally(() => setLoading(false));
  }, [enrollmentId, token]);

  async function save(publish = false) {
    publish ? setPublishing(true) : setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const method = feedback?.id ? "PATCH" : "POST";
      const path = feedback?.id
        ? `/api/instructor/feedback/${enrollmentId}`
        : `/api/instructor/feedback/${enrollmentId}`;

      const updated = await apiFetch<FeedbackData>(path, {
        method,
        token,
        body: JSON.stringify({
          personalNote: note,
          sticker,
          publish,
        }),
      });
      setFeedback(updated);
      setSuccessMsg(publish ? "Feedback published!" : "Feedback saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feedback.");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Feedback Card</h1>
      <p className="page-subtitle">Write a personalized feedback card for this student</p>

      {error && <p className="status status--error">{error}</p>}
      {successMsg && <p className="status status--success">{successMsg}</p>}

      <div className="card">
        <div className="form-field" style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontWeight: 500, marginBottom: "0.5rem", display: "block" }}>
            Pick a Sticker
          </label>
          <div className="sticker-picker">
            {STICKER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`sticker-option${sticker === opt.key ? " sticker-option--selected" : ""}`}
                onClick={() => setSticker(opt.key)}
                title={opt.key}
                aria-label={opt.key}
              >
                <span style={{ fontSize: "2rem" }}>{opt.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label
            htmlFor="personal-note"
            style={{ fontWeight: 500, marginBottom: "0.5rem", display: "block" }}
          >
            Personal Note
          </label>
          <textarea
            id="personal-note"
            rows={5}
            style={{ width: "100%", resize: "vertical" }}
            placeholder="Write a personal note for the student..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {feedback?.published && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.75rem" }}>
            This feedback card has been published.
          </p>
        )}

        <div className="form-actions" style={{ marginTop: "1.25rem" }}>
          <button
            type="button"
            className="btn"
            onClick={() => save(false)}
            disabled={saving || publishing}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => save(true)}
            disabled={saving || publishing}
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
