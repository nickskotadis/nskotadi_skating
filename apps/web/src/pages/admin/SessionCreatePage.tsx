import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";
import type { SkatingLevel } from "../../lib/types";

type RinkLocation = {
  id: string;
  name: string;
  sort_order: number;
};

type DbUser = {
  id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function SessionCreatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [levels, setLevels] = useState<SkatingLevel[]>([]);
  const [locations, setLocations] = useState<RinkLocation[]>([]);
  const [instructors, setInstructors] = useState<DbUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [levelId, setLevelId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<SkatingLevel[]>("/api/admin/levels", { token }),
      apiFetch<RinkLocation[]>("/api/admin/locations", { token }),
      apiFetch<DbUser[]>("/api/admin/users", { token }),
    ])
      .then(([lvls, locs, users]) => {
        setLevels(lvls);
        setLocations(locs);
        setInstructors(users.filter((u) => u.role === "instructor"));
        if (lvls.length > 0) setLevelId(lvls[0].id);
        if (locs.length > 0) setLocationId(locs[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load form data."))
      .finally(() => setLoadingData(false));
  }, [token]);

  function toggleInstructor(id: string) {
    setSelectedInstructors((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/admin/sessions", {
        method: "POST",
        token,
        body: JSON.stringify({
          name,
          levelId,
          locationId,
          dayOfWeek,
          startTime,
          endTime,
          seasonStart,
          seasonEnd,
          capacity: parseInt(capacity),
          instructorIds: selectedInstructors,
        }),
      });
      navigate("/admin/sessions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingData) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">New Session</h1>
      <p className="page-subtitle">Create a new skating session</p>

      {error && <p className="status status--error">{error}</p>}

      <div className="card">
        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-field">
            <label htmlFor="session-name">Session Name</label>
            <input
              id="session-name"
              type="text"
              placeholder="e.g. Tuesday Beginner Group"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="level">Level</label>
              <select
                id="level"
                className="select-input"
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                required
              >
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="location">Location</label>
              <select
                id="location"
                className="select-input"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="day">Day of Week</label>
              <select
                id="day"
                className="select-input"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="start-time">Start Time</label>
              <input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="end-time">End Time</label>
              <input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="season-start">Season Start</label>
              <input
                id="season-start"
                type="date"
                value={seasonStart}
                onChange={(e) => setSeasonStart(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="season-end">Season End</label>
              <input
                id="season-end"
                type="date"
                value={seasonEnd}
                onChange={(e) => setSeasonEnd(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="capacity">Capacity</label>
              <input
                id="capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
                style={{ width: "100px" }}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Instructors</label>
            {instructors.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No instructors available.</p>
            ) : (
              <div className="checkbox-grid">
                {instructors.map((inst) => (
                  <label key={inst.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedInstructors.includes(inst.id)}
                      onChange={() => toggleInstructor(inst.id)}
                    />
                    {inst.first_name} {inst.last_name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? "Creating..." : "Create Session"}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => navigate("/admin/sessions")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
