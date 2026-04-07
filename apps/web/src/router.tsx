import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import type { UserRole } from "./lib/types";

import Shell from "./components/layout/Shell";
import LoginPage from "./pages/LoginPage";

// Admin pages
import AdminDashboard from "./pages/admin/DashboardPage";
import UsersPage from "./pages/admin/UsersPage";
import LevelsPage from "./pages/admin/LevelsPage";
import LocationsPage from "./pages/admin/LocationsPage";
import SessionsPage from "./pages/admin/SessionsPage";
import SessionCreatePage from "./pages/admin/SessionCreatePage";
import SessionDetailPage from "./pages/admin/SessionDetailPage";
import MakeupsPage from "./pages/admin/MakeupsPage";
import RatingsPage from "./pages/admin/RatingsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import IceShowPage from "./pages/admin/IceShowPage";

// Instructor pages
import InstructorDashboard from "./pages/instructor/DashboardPage";
import MySessionsPage from "./pages/instructor/MySessionsPage";
import AttendancePage from "./pages/instructor/AttendancePage";
import InstructorSkillsPage from "./pages/instructor/SkillsPage";

// Student pages
import StudentDashboard from "./pages/student/DashboardPage";
import StudentSchedulePage from "./pages/student/SchedulePage";
import StudentSkillsPage from "./pages/student/SkillsPage";
import StudentFeedbackPage from "./pages/student/FeedbackPage";

// Parent pages
import ParentDashboard from "./pages/parent/DashboardPage";
import ChildSchedulePage from "./pages/parent/ChildSchedulePage";
import ChildSkillsPage from "./pages/parent/ChildSkillsPage";
import ChildFeedbackPage from "./pages/parent/ChildFeedbackPage";
import RatePage from "./pages/parent/RatePage";
import CalendarPage from "./pages/parent/CalendarPage";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  instructor: "/instructor",
  student: "/student",
  parent: "/parent",
};

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="page"><p style={{ textAlign: "center", padding: "2rem" }}>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/", element: <RootRedirect /> },
  {
    element: (
      <AuthGuard>
        <Shell />
      </AuthGuard>
    ),
    children: [
      // Admin routes
      { path: "/admin", element: <RoleGuard role="admin"><AdminDashboard /></RoleGuard> },
      { path: "/admin/users", element: <RoleGuard role="admin"><UsersPage /></RoleGuard> },
      { path: "/admin/levels", element: <RoleGuard role="admin"><LevelsPage /></RoleGuard> },
      { path: "/admin/locations", element: <RoleGuard role="admin"><LocationsPage /></RoleGuard> },
      { path: "/admin/sessions", element: <RoleGuard role="admin"><SessionsPage /></RoleGuard> },
      { path: "/admin/sessions/new", element: <RoleGuard role="admin"><SessionCreatePage /></RoleGuard> },
      { path: "/admin/sessions/:id", element: <RoleGuard role="admin"><SessionDetailPage /></RoleGuard> },
      { path: "/admin/makeups", element: <RoleGuard role="admin"><MakeupsPage /></RoleGuard> },
      { path: "/admin/ratings", element: <RoleGuard role="admin"><RatingsPage /></RoleGuard> },
      { path: "/admin/reports", element: <RoleGuard role="admin"><ReportsPage /></RoleGuard> },
      { path: "/admin/ice-show", element: <RoleGuard role="admin"><IceShowPage /></RoleGuard> },

      // Instructor routes
      { path: "/instructor", element: <RoleGuard role="instructor"><InstructorDashboard /></RoleGuard> },
      { path: "/instructor/sessions", element: <RoleGuard role="instructor"><MySessionsPage /></RoleGuard> },
      { path: "/instructor/attendance", element: <RoleGuard role="instructor"><AttendancePage /></RoleGuard> },
      { path: "/instructor/attendance/:sessionId", element: <RoleGuard role="instructor"><AttendancePage /></RoleGuard> },
      { path: "/instructor/skills", element: <RoleGuard role="instructor"><InstructorSkillsPage /></RoleGuard> },
      { path: "/instructor/skills/:sessionId", element: <RoleGuard role="instructor"><InstructorSkillsPage /></RoleGuard> },

      // Student routes
      { path: "/student", element: <RoleGuard role="student"><StudentDashboard /></RoleGuard> },
      { path: "/student/schedule", element: <RoleGuard role="student"><StudentSchedulePage /></RoleGuard> },
      { path: "/student/skills", element: <RoleGuard role="student"><StudentSkillsPage /></RoleGuard> },
      { path: "/student/feedback", element: <RoleGuard role="student"><StudentFeedbackPage /></RoleGuard> },

      // Parent routes
      { path: "/parent", element: <RoleGuard role="parent"><ParentDashboard /></RoleGuard> },
      { path: "/parent/schedule", element: <RoleGuard role="parent"><ChildSchedulePage /></RoleGuard> },
      { path: "/parent/skills", element: <RoleGuard role="parent"><ChildSkillsPage /></RoleGuard> },
      { path: "/parent/feedback", element: <RoleGuard role="parent"><ChildFeedbackPage /></RoleGuard> },
      { path: "/parent/rate", element: <RoleGuard role="parent"><RatePage /></RoleGuard> },
      { path: "/parent/calendar", element: <RoleGuard role="parent"><CalendarPage /></RoleGuard> },
    ],
  },
]);
