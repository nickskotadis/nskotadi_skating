import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Skater";

  return (
    <div className="page-content">
      <h1 className="page-title">My Dashboard</h1>
      <p className="page-subtitle">Welcome, {name}! Ready to skate?</p>

      <div className="coming-soon-grid">
        <Link to="/student/schedule" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">🗓️</span>
          <h3>My Schedule</h3>
          <p>See your upcoming class dates, times, and rink locations.</p>
        </Link>
        <Link to="/student/skills" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">⭐</span>
          <h3>My Skills</h3>
          <p>Track your progress through each level's skill checklist.</p>
        </Link>
        <Link to="/student/feedback" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">🎴</span>
          <h3>Feedback Card</h3>
          <p>View your end-of-level feedback from your instructor.</p>
        </Link>
        <Link to="/student/schedule" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">🎭</span>
          <h3>Ice Show</h3>
          <p>View your ice show group practice schedule.</p>
        </Link>
      </div>
    </div>
  );
}
