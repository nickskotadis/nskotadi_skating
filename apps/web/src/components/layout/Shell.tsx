import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { UserRole } from "../../lib/types";

type NavItem = { label: string; to: string };

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", to: "/admin" },
    { label: "Users", to: "/admin/users" },
    { label: "Skill Levels", to: "/admin/levels" },
    { label: "Locations", to: "/admin/locations" },
    { label: "Sessions", to: "/admin/sessions" },
    { label: "Make-ups", to: "/admin/makeups" },
    { label: "Ratings", to: "/admin/ratings" },
    { label: "Reports", to: "/admin/reports" },
    { label: "Ice Show", to: "/admin/ice-show" },
  ],
  instructor: [
    { label: "Dashboard", to: "/instructor" },
    { label: "My Sessions", to: "/instructor/sessions" },
    { label: "Attendance", to: "/instructor/attendance" },
    { label: "Skills", to: "/instructor/skills" },
  ],
  student: [
    { label: "Dashboard", to: "/student" },
    { label: "Schedule", to: "/student/schedule" },
    { label: "My Skills", to: "/student/skills" },
    { label: "Feedback", to: "/student/feedback" },
  ],
  parent: [
    { label: "Dashboard", to: "/parent" },
    { label: "Schedule", to: "/parent/schedule" },
    { label: "Skills", to: "/parent/skills" },
    { label: "Feedback", to: "/parent/feedback" },
    { label: "Rate Instructors", to: "/parent/rate" },
    { label: "Calendar", to: "/parent/calendar" },
  ],
};

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] ?? [];
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.userId.slice(0, 8);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">⛸</span>
          <span>SkateTrack</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split("/").length <= 2}
              className={({ isActive }) =>
                ["nav-item", isActive ? "nav-item--active" : ""].join(" ").trim()
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className={`role-badge role-badge--${user.role}`}>{user.role}</span>
            <span className="sidebar-username">{displayName}</span>
          </div>
          <button type="button" className="ghost btn-sm" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </aside>
      <main className="shell-content">
        <Outlet />
      </main>
    </div>
  );
}
