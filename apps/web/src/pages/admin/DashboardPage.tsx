import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";
import type { DbUser, SkatingLevel } from "../../lib/types";

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [levels, setLevels] = useState<SkatingLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<DbUser[]>("/api/admin/users", { token }),
      apiFetch<SkatingLevel[]>("/api/admin/levels", { token }),
    ])
      .then(([u, l]) => {
        setUsers(u);
        setLevels(l);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const roleCounts = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="page-content">
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="page-subtitle">
        Welcome back, {user?.firstName ?? "Admin"}. Here's an overview of the school.
      </p>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-value">{users.length}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{roleCounts.student ?? 0}</div>
              <div className="stat-label">Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{roleCounts.instructor ?? 0}</div>
              <div className="stat-label">Instructors</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{roleCounts.parent ?? 0}</div>
              <div className="stat-label">Parents</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{levels.length}</div>
              <div className="stat-label">Skill Levels</div>
            </div>
          </div>

          <div className="quick-links">
            <h2>Quick Actions</h2>
            <div className="link-grid">
              <Link to="/admin/users" className="quick-link-card">
                <span className="quick-link-icon">👥</span>
                <span>Manage Users</span>
              </Link>
              <Link to="/admin/levels" className="quick-link-card">
                <span className="quick-link-icon">🏅</span>
                <span>Skill Levels</span>
              </Link>
              <Link to="/admin/locations" className="quick-link-card">
                <span className="quick-link-icon">📍</span>
                <span>Rink Locations</span>
              </Link>
              <Link to="/admin/sessions" className="quick-link-card">
                <span className="quick-link-icon">📅</span>
                <span>Sessions</span>
              </Link>
              <Link to="/admin/makeups" className="quick-link-card">
                <span className="quick-link-icon">🔄</span>
                <span>Makeup Requests</span>
              </Link>
              <Link to="/admin/ratings" className="quick-link-card">
                <span className="quick-link-icon">⭐</span>
                <span>Instructor Ratings</span>
              </Link>
              <Link to="/admin/reports" className="quick-link-card">
                <span className="quick-link-icon">📝</span>
                <span>Feedback Reports</span>
              </Link>
              <Link to="/admin/ice-show" className="quick-link-card">
                <span className="quick-link-icon">🎭</span>
                <span>Ice Show</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
