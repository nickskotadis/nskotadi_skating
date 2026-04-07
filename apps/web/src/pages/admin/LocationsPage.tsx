import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

type RinkLocation = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  sort_order: number;
};

export default function LocationsPage() {
  const { token } = useAuth();
  const [locations, setLocations] = useState<RinkLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [newDesc, setNewDesc] = useState("");
  const [newOrder, setNewOrder] = useState("");
  const [adding, setAdding] = useState(false);

  async function loadLocations() {
    try {
      const data = await apiFetch<RinkLocation[]>("/api/admin/locations", { token });
      setLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, [token]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      const data = await apiFetch<RinkLocation>("/api/admin/locations", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newName,
          color: newColor,
          description: newDesc || undefined,
          sortOrder: newOrder ? parseInt(newOrder) : locations.length + 1,
        }),
      });
      setLocations((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setNewName("");
      setNewColor("#3b82f6");
      setNewDesc("");
      setNewOrder("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this location?")) return;
    try {
      await apiFetch(`/api/admin/locations/${id}`, { method: "DELETE", token });
      setLocations((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete location.");
    }
  }

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Rink Locations</h1>
      <p className="page-subtitle">Manage rink locations used in sessions</p>

      {error && <p className="status status--error">{error}</p>}

      <div className="card">
        <h2 className="card-title">Add Location</h2>
        <form onSubmit={handleAdd} className="inline-form">
          <input
            type="text"
            placeholder="Location name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <label className="color-field">
            <span>Color</span>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
            />
            <input
              type="text"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              pattern="^#[0-9a-fA-F]{6}$"
              placeholder="#hex"
              style={{ width: "90px" }}
            />
          </label>
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
          <button type="submit" className="btn" disabled={adding}>
            {adding ? "Adding..." : "Add Location"}
          </button>
        </form>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Color</th>
              <th>Name</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  No locations yet.
                </td>
              </tr>
            ) : (
              locations.map((loc) => (
                <tr key={loc.id}>
                  <td>{loc.sort_order}</td>
                  <td>
                    <div
                      className="color-swatch"
                      style={{ backgroundColor: loc.color }}
                      title={loc.color}
                    />
                  </td>
                  <td>{loc.name}</td>
                  <td>{loc.description ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleDelete(loc.id)}
                    >
                      Delete
                    </button>
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
