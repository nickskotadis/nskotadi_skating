import { useAuth } from "../../contexts/AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Skater";

  return (
    <div className="page-content">
      <h1 className="page-title">My Dashboard</h1>
      <p className="page-subtitle">Welcome, {name}! Ready to skate?</p>

      <div className="coming-soon-grid">
        <div className="coming-soon-card">
          <span className="coming-soon-icon">🗓️</span>
          <h3>My Schedule</h3>
          <p>See your upcoming class dates, times, and rink locations.</p>
          <span className="phase-tag">Coming in Phase 2</span>
        </div>
        <div className="coming-soon-card">
          <span className="coming-soon-icon">⭐</span>
          <h3>My Skills</h3>
          <p>Track your progress through each level's skill checklist.</p>
          <span className="phase-tag">Coming in Phase 2</span>
        </div>
        <div className="coming-soon-card">
          <span className="coming-soon-icon">🎴</span>
          <h3>Feedback Card</h3>
          <p>View your end-of-level feedback from your instructor.</p>
          <span className="phase-tag">Coming in Phase 2</span>
        </div>
        <div className="coming-soon-card">
          <span className="coming-soon-icon">🎭</span>
          <h3>Ice Show</h3>
          <p>View your ice show group practice schedule.</p>
          <span className="phase-tag">Coming in Phase 3</span>
        </div>
      </div>
    </div>
  );
}
