import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import type { UserRole } from "./lib/types";

import Shell from "./components/layout/Shell";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/DashboardPage";
import UsersPage from "./pages/admin/UsersPage";
import LevelsPage from "./pages/admin/LevelsPage";
import InstructorDashboard from "./pages/instructor/DashboardPage";
import StudentDashboard from "./pages/student/DashboardPage";
import ParentDashboard from "./pages/parent/DashboardPage";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  instructor: "/instructor",
  student: "/student",
  parent: "/parent",
};

// Redirect to the correct dashboard based on role, or /login if not authenticated
function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

// Guard: redirect to /login if not authenticated
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="page"><p style={{ textAlign: "center", padding: "2rem" }}>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Guard: redirect to role's own dashboard if wrong role
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
      {
        path: "/admin",
        element: (
          <RoleGuard role="admin">
            <AdminDashboard />
          </RoleGuard>
        ),
      },
      {
        path: "/admin/users",
        element: (
          <RoleGuard role="admin">
            <UsersPage />
          </RoleGuard>
        ),
      },
      {
        path: "/admin/levels",
        element: (
          <RoleGuard role="admin">
            <LevelsPage />
          </RoleGuard>
        ),
      },

      // Instructor routes
      {
        path: "/instructor",
        element: (
          <RoleGuard role="instructor">
            <InstructorDashboard />
          </RoleGuard>
        ),
      },

      // Student routes
      {
        path: "/student",
        element: (
          <RoleGuard role="student">
            <StudentDashboard />
          </RoleGuard>
        ),
      },

      // Parent routes
      {
        path: "/parent",
        element: (
          <RoleGuard role="parent">
            <ParentDashboard />
          </RoleGuard>
        ),
      },
    ],
  },
]);
