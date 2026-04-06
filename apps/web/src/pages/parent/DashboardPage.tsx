import { useAuth } from "../../contexts/AuthContext";

export default function ParentDashboard() {
  const { user } = useAuth();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Parent";

  return (
    <div className="page-content">
      <h1 className="page-title">Parent Dashboard</h1>
      <p className="page-subtitle">Welcome, {name}! Here's your family's skating overview.</p>

      <div className="coming-soon-grid">
        <div className="coming-soon-card">
          <span className="coming-soon-icon">👶</span>
          <h3>My Children</h3>
          <p>View your linked children and their class enrollments.</p>
          <span className="phase-tag">Coming in Phase 2</span>
        </div>
        <div className="coming-soon-card">
          <span className="coming-soon-icon">📅</span>
          <h3>Schedule</h3>
          <p>See all upcoming classes for your children in one place.</p>
          <span className="phase-tag">Coming in Phase 2</span>
        </div>
        <div className="coming-soon-card">
          <span className="coming-soon-icon">📆</span>
          <h3>Calendar Export</h3>
          <p>Add skating schedules to Google, Apple, or Outlook Calendar.</p>
          <span className="phase-tag">Coming in Phase 3</span>
        </div>
        <div className="coming-soon-card">
          <span className="coming-soon-icon">⭐</span>
          <h3>Rate Instructors</h3>
          <p>Leave feedback for your children's instructors.</p>
          <span className="phase-tag">Coming in Phase 2</span>
        </div>
      </div>
    </div>
  );
}
