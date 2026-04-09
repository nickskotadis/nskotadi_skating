import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type InstructorOption = {
  id: string;
  first_name: string;
  last_name: string;
  session_id: string;
  session_name: string;
};

export default function RatePage() {
  const { token } = useAuth();

  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    apiFetch<InstructorOption[]>("/api/parent/instructors", { token })
      .then((data) => setInstructors(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load instructors."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    const selected = instructors[selectedIdx];
    if (!selected) { setError("Please select an instructor."); return; }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      await apiFetch("/api/parent/ratings", {
        method: "POST",
        token,
        body: JSON.stringify({
          sessionId: selected.session_id,
          instructorId: selected.id,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      setSuccessMsg("Your rating has been submitted. Thank you!");
      setRating(0);
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  const displayRating = hoveredRating || rating;

  return (
    <div className="page-content">
      <h1 className="page-title">Rate an Instructor</h1>
      <p className="page-subtitle">Share your experience with your child's instructor</p>

      {error && <p className="status status--error">{error}</p>}
      {successMsg && <p className="status status--success">{successMsg}</p>}

      {instructors.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          No instructors available to rate at this time.
        </p>
      ) : (
        <div className="card" style={{ maxWidth: "480px" }}>
          <form onSubmit={handleSubmit} className="form-stack">
            <div className="form-field">
              <label htmlFor="instructor-select">Instructor &amp; Session</label>
              <select
                id="instructor-select"
                className="select-input"
                value={selectedIdx}
                onChange={(e) => setSelectedIdx(Number(e.target.value))}
                required
              >
                {instructors.map((inst, idx) => (
                  <option key={`${inst.id}-${inst.session_id}`} value={idx}>
                    {inst.first_name} {inst.last_name} — {inst.session_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Rating</label>
              <div className="star-rating" role="group" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    style={{
                      fontSize: "2rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: star <= displayRating ? "#f59e0b" : "#d1d5db",
                      padding: "0 0.125rem",
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="comment">Comment (optional)</label>
              <textarea
                id="comment"
                rows={3}
                style={{ width: "100%", resize: "vertical" }}
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn" disabled={submitting || rating === 0}>
                {submitting ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
