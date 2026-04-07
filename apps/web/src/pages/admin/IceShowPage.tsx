import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type PracticeDate = {
  id: string;
  practice_date: string;
  start_time: string;
  end_time: string;
};

type ShowGroup = {
  id: string;
  name: string;
  session_ids: string[];
  practice_dates: PracticeDate[];
};

type IceShow = {
  id: string;
  name: string;
  show_date: string;
  description: string | null;
  groups: ShowGroup[];
};

type SessionOption = {
  id: string;
  name: string;
};

export default function IceShowPage() {
  const { token } = useAuth();
  const [shows, setShows] = useState<IceShow[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedShow, setExpandedShow] = useState<string | null>(null);

  // New show form
  const [newShowName, setNewShowName] = useState("");
  const [newShowDate, setNewShowDate] = useState("");
  const [newShowDesc, setNewShowDesc] = useState("");
  const [addingShow, setAddingShow] = useState(false);

  // New group form (per show)
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroupFor, setAddingGroupFor] = useState<string | null>(null);

  // New practice date form (per group)
  const [newPracticeDate, setNewPracticeDate] = useState("");
  const [newPracticeStart, setNewPracticeStart] = useState("");
  const [newPracticeEnd, setNewPracticeEnd] = useState("");
  const [addingPracticeFor, setAddingPracticeFor] = useState<string | null>(null);

  async function loadShows() {
    try {
      const data = await apiFetch<IceShow[]>("/api/admin/ice-shows", { token });
      setShows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ice shows.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      loadShows(),
      apiFetch<SessionOption[]>("/api/admin/sessions", { token }).then(setSessions),
    ]).catch(() => {});
  }, [token]);

  async function handleAddShow(e: FormEvent) {
    e.preventDefault();
    setAddingShow(true);
    setError("");
    try {
      const data = await apiFetch<IceShow>("/api/admin/ice-shows", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newShowName,
          showDate: newShowDate,
          description: newShowDesc || undefined,
        }),
      });
      setShows((prev) => [...prev, data]);
      setNewShowName("");
      setNewShowDate("");
      setNewShowDesc("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create show.");
    } finally {
      setAddingShow(false);
    }
  }

  async function handleDeleteShow(showId: string) {
    if (!confirm("Delete this ice show?")) return;
    try {
      await apiFetch(`/api/admin/ice-shows/${showId}`, { method: "DELETE", token });
      setShows((prev) => prev.filter((s) => s.id !== showId));
      if (expandedShow === showId) setExpandedShow(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete show.");
    }
  }

  async function handleAddGroup(e: FormEvent, showId: string) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setAddingGroupFor(showId);
    try {
      const updated = await apiFetch<IceShow>(`/api/admin/ice-shows/${showId}/groups`, {
        method: "POST",
        token,
        body: JSON.stringify({ name: newGroupName }),
      });
      setShows((prev) => prev.map((s) => (s.id === showId ? updated : s)));
      setNewGroupName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add group.");
    } finally {
      setAddingGroupFor(null);
    }
  }

  async function handleAssignSession(showId: string, groupId: string, sessionId: string) {
    try {
      const updated = await apiFetch<IceShow>(
        `/api/admin/ice-shows/${showId}/groups/${groupId}/sessions`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ sessionId }),
        }
      );
      setShows((prev) => prev.map((s) => (s.id === showId ? updated : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign session.");
    }
  }

  async function handleAddPractice(e: FormEvent, showId: string, groupId: string) {
    e.preventDefault();
    setAddingPracticeFor(groupId);
    try {
      const updated = await apiFetch<IceShow>(
        `/api/admin/ice-shows/${showId}/groups/${groupId}/practices`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            practiceDate: newPracticeDate,
            startTime: newPracticeStart,
            endTime: newPracticeEnd,
          }),
        }
      );
      setShows((prev) => prev.map((s) => (s.id === showId ? updated : s)));
      setNewPracticeDate("");
      setNewPracticeStart("");
      setNewPracticeEnd("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add practice date.");
    } finally {
      setAddingPracticeFor(null);
    }
  }

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Ice Shows</h1>
      <p className="page-subtitle">Manage ice shows, groups, and practice schedules</p>

      {error && <p className="status status--error">{error}</p>}

      <div className="card">
        <h2 className="card-title">Add Ice Show</h2>
        <form onSubmit={handleAddShow} className="inline-form">
          <input
            type="text"
            placeholder="Show name"
            value={newShowName}
            onChange={(e) => setNewShowName(e.target.value)}
            required
          />
          <input
            type="date"
            value={newShowDate}
            onChange={(e) => setNewShowDate(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newShowDesc}
            onChange={(e) => setNewShowDesc(e.target.value)}
          />
          <button type="submit" className="btn" disabled={addingShow}>
            {addingShow ? "Creating..." : "Create Show"}
          </button>
        </form>
      </div>

      <div className="shows-list">
        {shows.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No ice shows yet.</p>
        ) : (
          shows.map((show) => (
            <div key={show.id} className="show-item card">
              <div className="level-header" onClick={() => setExpandedShow(expandedShow === show.id ? null : show.id)}>
                <div className="level-info">
                  <span className="level-name">{show.name}</span>
                  <span className="level-desc">
                    {format(new Date(show.show_date), "MMMM d, yyyy")}
                  </span>
                  {show.description && (
                    <span className="level-desc">{show.description}</span>
                  )}
                </div>
                <div className="level-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleDeleteShow(show.id); }}
                  >
                    Delete
                  </button>
                  <span className="expand-icon">{expandedShow === show.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {expandedShow === show.id && (
                <div className="show-groups" style={{ padding: "1rem", borderTop: "1px solid var(--border)" }}>
                  <h3 style={{ marginBottom: "0.75rem" }}>Groups</h3>

                  {(show.groups ?? []).map((group) => (
                    <div key={group.id} className="group-item">
                      <h4 className="group-name">{group.name}</h4>

                      <div className="group-section">
                        <strong>Sessions:</strong>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                          {(group.session_ids ?? []).map((sid) => {
                            const s = sessions.find((ss) => ss.id === sid);
                            return s ? (
                              <span key={sid} className="role-badge">{s.name}</span>
                            ) : null;
                          })}
                          <select
                            className="select-input"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) handleAssignSession(show.id, group.id, e.target.value);
                              e.target.value = "";
                            }}
                          >
                            <option value="">+ Assign session...</option>
                            {sessions
                              .filter((s) => !(group.session_ids ?? []).includes(s.id))
                              .map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="group-section">
                        <strong>Practice Dates:</strong>
                        {(group.practice_dates ?? []).length === 0 ? (
                          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>None yet.</p>
                        ) : (
                          <ul className="date-list" style={{ marginTop: "0.25rem" }}>
                            {group.practice_dates.map((pd) => (
                              <li key={pd.id}>
                                {format(new Date(pd.practice_date), "EEE, MMM d, yyyy")}
                                {pd.start_time && ` ${pd.start_time}–${pd.end_time}`}
                              </li>
                            ))}
                          </ul>
                        )}
                        <form
                          onSubmit={(e) => handleAddPractice(e, show.id, group.id)}
                          className="inline-form"
                          style={{ marginTop: "0.5rem" }}
                        >
                          <input
                            type="date"
                            value={addingPracticeFor === group.id ? newPracticeDate : ""}
                            onChange={(e) => setNewPracticeDate(e.target.value)}
                            required
                            onFocus={() => {}}
                          />
                          <input
                            type="time"
                            value={addingPracticeFor === group.id ? newPracticeStart : ""}
                            onChange={(e) => setNewPracticeStart(e.target.value)}
                          />
                          <input
                            type="time"
                            value={addingPracticeFor === group.id ? newPracticeEnd : ""}
                            onChange={(e) => setNewPracticeEnd(e.target.value)}
                          />
                          <button
                            type="submit"
                            className="btn btn-sm"
                            disabled={addingPracticeFor === group.id}
                          >
                            Add Practice
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}

                  <form
                    onSubmit={(e) => handleAddGroup(e, show.id)}
                    className="inline-form"
                    style={{ marginTop: "0.75rem" }}
                  >
                    <input
                      type="text"
                      placeholder="New group name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-sm"
                      disabled={addingGroupFor === show.id}
                    >
                      {addingGroupFor === show.id ? "Adding..." : "Add Group"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
