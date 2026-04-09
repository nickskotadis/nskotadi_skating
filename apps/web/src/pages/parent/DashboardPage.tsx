import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ParentDashboard() {
  const { user } = useAuth();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Parent";

  return (
    <div className="page-content">
      <h1 className="page-title">Parent Dashboard</h1>
      <p className="page-subtitle">Welcome, {name}! Here's your family's skating overview.</p>

      <div className="coming-soon-grid">
        <Link to="/parent/schedule" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">👶</span>
          <h3>My Children</h3>
          <p>View your linked children and their class enrollments.</p>
        </Link>
        <Link to="/parent/schedule" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">📅</span>
          <h3>Schedule</h3>
          <p>See all upcoming classes for your children in one place.</p>
        </Link>
        <Link to="/parent/skills" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">⭐</span>
          <h3>Skills Progress</h3>
          <p>Track your child's skill checklist progress.</p>
        </Link>
        <Link to="/parent/feedback" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">🎴</span>
          <h3>Feedback Card</h3>
          <p>Read your child's end-of-level feedback from their instructor.</p>
        </Link>
        <Link to="/parent/calendar" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">📆</span>
          <h3>Calendar Export</h3>
          <p>Add skating schedules to Google, Apple, or Outlook Calendar.</p>
        </Link>
        <Link to="/parent/rate" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">⭐</span>
          <h3>Rate Instructors</h3>
          <p>Leave feedback for your children's instructors.</p>
        </Link>
      </div>
    </div>
  );
}
