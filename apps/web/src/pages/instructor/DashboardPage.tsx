import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function InstructorDashboard() {
  const { user } = useAuth();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Instructor";

  return (
    <div className="page-content">
      <h1 className="page-title">Instructor Dashboard</h1>
      <p className="page-subtitle">Welcome back, {name}!</p>

      <div className="coming-soon-grid">
        <Link to="/instructor/sessions" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">📅</span>
          <h3>My Sessions</h3>
          <p>View your assigned class sessions and schedules.</p>
        </Link>
        <Link to="/instructor/attendance" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">✅</span>
          <h3>Attendance</h3>
          <p>Mark attendance for your students each class.</p>
        </Link>
        <Link to="/instructor/skills" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">🏅</span>
          <h3>Skill Assessments</h3>
          <p>Track which skills each student has passed.</p>
        </Link>
        <Link to="/instructor/feedback" className="coming-soon-card" style={{ textDecoration: "none", cursor: "pointer" }}>
          <span className="coming-soon-icon">📝</span>
          <h3>Feedback Cards</h3>
          <p>Write end-of-level feedback cards with notes and stickers.</p>
        </Link>
      </div>
    </div>
  );
}
