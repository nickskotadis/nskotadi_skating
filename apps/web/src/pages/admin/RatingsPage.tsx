import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type Rating = {
  id: string;
  rating: number;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  instructors: { first_name: string; last_name: string };
  sessions: { name: string };
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="star-display" aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < rating ? "#f59e0b" : "#d1d5db" }}>★</span>
      ))}
    </span>
  );
}

export default function RatingsPage() {
  const { token } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Rating[]>("/api/admin/ratings", { token })
      .then(setRatings)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load ratings."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAction(id: string, status: "approved" | "rejected") {
    setUpdating(id);
    setError("");
    try {
      const updated = await apiFetch<Rating>(`/api/admin/ratings/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status }),
      });
      setRatings((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rating.");
    } finally {
      setUpdating(null);
    }
  }

  const filtered = filter === "all" ? ratings : ratings.filter((r) => r.status === filter);

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Instructor Ratings</h1>
      <p className="page-subtitle">Review and moderate instructor ratings from parents</p>

      {error && <p className="status status--error">{error}</p>}

      <div className="filter-tabs">
        {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`btn btn-sm${filter === s ? " btn--active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== "all" && (
              <span className="tab-count">
                {" "}({ratings.filter((r) => r.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Instructor</th>
              <th>Session</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  No ratings found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.instructors.first_name} {r.instructors.last_name}</td>
                  <td>{r.sessions?.name ?? "—"}</td>
                  <td><StarDisplay rating={r.rating} /></td>
                  <td style={{ maxWidth: "200px" }}>{r.comment ?? "—"}</td>
                  <td>
                    <span className={`role-badge role-badge--${r.status}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.status === "pending" && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={updating === r.id}
                          onClick={() => handleAction(r.id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={updating === r.id}
                          onClick={() => handleAction(r.id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {r.status !== "pending" && (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
