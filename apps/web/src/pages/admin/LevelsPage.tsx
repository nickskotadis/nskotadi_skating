import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";
import type { SkatingLevel, Skill } from "../../lib/types";

export default function LevelsPage() {
  const { token } = useAuth();
  const [levels, setLevels] = useState<SkatingLevel[]>([]);
  const [skills, setSkills] = useState<Record<string, Skill[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New level form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOrder, setNewOrder] = useState("");
  const [adding, setAdding] = useState(false);

  // New skill form (per expanded level)
  const [newSkillName, setNewSkillName] = useState("");
  const [addingSkill, setAddingSkill] = useState(false);

  async function loadLevels() {
    try {
      const data = await apiFetch<SkatingLevel[]>("/api/admin/levels", { token });
      setLevels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load levels.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLevels();
  }, [token]);

  async function loadSkills(levelId: string) {
    if (skills[levelId]) return;
    try {
      const data = await apiFetch<Skill[]>(`/api/admin/levels/${levelId}/skills`, { token });
      setSkills((prev) => ({ ...prev, [levelId]: data }));
    } catch {
      setSkills((prev) => ({ ...prev, [levelId]: [] }));
    }
  }

  function toggleLevel(levelId: string) {
    if (expanded === levelId) {
      setExpanded(null);
    } else {
      setExpanded(levelId);
      loadSkills(levelId);
      setNewSkillName("");
    }
  }

  async function handleAddLevel(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const data = await apiFetch<SkatingLevel>("/api/admin/levels", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newName,
          description: newDesc || undefined,
          sortOrder: newOrder ? parseInt(newOrder) : levels.length + 1,
        }),
      });
      setLevels((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setNewName("");
      setNewDesc("");
      setNewOrder("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create level.");
    } finally {
      setAdding(false);
    }
  }

  async function handleAddSkill(e: FormEvent, levelId: string) {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    setAddingSkill(true);
    try {
      const data = await apiFetch<Skill>(`/api/admin/levels/${levelId}/skills`, {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newSkillName,
          sortOrder: (skills[levelId]?.length ?? 0) + 1,
        }),
      });
      setSkills((prev) => ({
        ...prev,
        [levelId]: [...(prev[levelId] ?? []), data],
      }));
      setNewSkillName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add skill.");
    } finally {
      setAddingSkill(false);
    }
  }

  async function deleteSkill(levelId: string, skillId: string) {
    try {
      await apiFetch(`/api/admin/levels/skills/${skillId}`, {
        method: "DELETE",
        token,
      });
      setSkills((prev) => ({
        ...prev,
        [levelId]: prev[levelId]?.filter((s) => s.id !== skillId) ?? [],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete skill.");
    }
  }

  async function deleteLevel(levelId: string) {
    if (!confirm("Delete this level and all its skills?")) return;
    try {
      await apiFetch(`/api/admin/levels/${levelId}`, { method: "DELETE", token });
      setLevels((prev) => prev.filter((l) => l.id !== levelId));
      if (expanded === levelId) setExpanded(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete level.");
    }
  }

  if (loading) return <div className="page-content"><p className="loading-text">Loading levels...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Skill Levels</h1>
      <p className="page-subtitle">Manage skating levels and skills catalog</p>

      {error && <p className="status status--error">{error}</p>}

      {/* Add level form */}
      <div className="card">
        <h2 className="card-title">Add Level</h2>
        <form onSubmit={handleAddLevel} className="inline-form">
          <input
            type="text"
            placeholder="Level name (e.g. Pre-Free Skate)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <input
            type="number"
            placeholder="Order"
            value={newOrder}
            onChange={(e) => setNewOrder(e.target.value)}
            min={1}
            style={{ width: "80px" }}
          />
          <button type="submit" disabled={adding}>
            {adding ? "Adding..." : "Add Level"}
          </button>
        </form>
      </div>

      {/* Levels list */}
      <div className="levels-list">
        {levels.map((level) => (
          <div key={level.id} className="level-item">
            <div className="level-header" onClick={() => toggleLevel(level.id)}>
              <div className="level-info">
                <span className="level-badge">{level.sort_order}</span>
                <span className="level-name">{level.name}</span>
                {level.description && (
                  <span className="level-desc">{level.description}</span>
                )}
              </div>
              <div className="level-actions">
                <button
                  type="button"
                  className="ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); deleteLevel(level.id); }}
                >
                  Delete
                </button>
                <span className="expand-icon">{expanded === level.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {expanded === level.id && (
              <div className="level-skills">
                {(skills[level.id] ?? []).length === 0 ? (
                  <p className="empty-text">No skills yet. Add one below.</p>
                ) : (
                  <ul className="skill-list">
                    {(skills[level.id] ?? []).map((skill) => (
                      <li key={skill.id} className="skill-item">
                        <span className="skill-order">{skill.sort_order}.</span>
                        <span className="skill-name">{skill.name}</span>
                        <button
                          type="button"
                          className="ghost btn-xs"
                          onClick={() => deleteSkill(level.id, skill.id)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={(e) => handleAddSkill(e, level.id)}
                  className="inline-form inline-form--sm"
                >
                  <input
                    type="text"
                    placeholder="New skill name"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    required
                  />
                  <button type="submit" disabled={addingSkill}>
                    {addingSkill ? "..." : "Add Skill"}
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
