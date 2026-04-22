import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch, apiUrl } from "../../lib/api";

type CalendarUrls = {
  webcalUrl: string;
  googleUrl: string;
  outlookUrl: string;
};

type PracticeDate = {
  id: string;
  practice_date: string;
  start_time: string;
  end_time: string;
  group_name: string;
  show_name: string;
};

export default function CalendarPage() {
  const { token } = useAuth();

  const [calendarUrls, setCalendarUrls] = useState<CalendarUrls | null>(null);
  const [practices, setPractices] = useState<PracticeDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<CalendarUrls>("/api/parent/calendar/subscription-url", { token }),
      apiFetch<PracticeDate[]>("/api/parent/calendar/practices", { token }).catch(() => []),
    ])
      .then(([urls, practiceDates]) => {
        setCalendarUrls(urls);
        setPractices(practiceDates as PracticeDate[]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load calendar info."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDownloadIcs() {
    setDownloading(true);
    try {
      const response = await fetch(apiUrl("/api/parent/calendar/feed.ics"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to download calendar.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "skatetrack-schedule.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download .ics file.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <div className="page-content"><p className="loading-text">Loading...</p></div>;

  return (
    <div className="page-content">
      <h1 className="page-title">Calendar Export</h1>
      <p className="page-subtitle">Sync your child's skating schedule with your favourite calendar app</p>

      {error && <p className="status status--error">{error}</p>}

      <div className="card">
        <h2 className="card-title">Export Options</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--ink-soft)", marginBottom: "1rem" }}>
          Subscribing keeps your calendar up to date automatically when class dates change.
        </p>

        <div className="calendar-options">
          <button
            type="button"
            className="calendar-option-btn"
            onClick={handleDownloadIcs}
            disabled={downloading}
          >
            <span className="calendar-option-icon">📥</span>
            {downloading ? "Downloading…" : "Download .ics"}
          </button>

          {calendarUrls?.webcalUrl && (
            <a
              href={calendarUrls.webcalUrl}
              className="calendar-option-btn"
              style={{ textDecoration: "none" }}
            >
              <span className="calendar-option-icon">🍎</span>
              Apple Calendar
            </a>
          )}

          {calendarUrls?.googleUrl && (
            <a
              href={calendarUrls.googleUrl}
              className="calendar-option-btn"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <span className="calendar-option-icon">📅</span>
              Google Calendar
            </a>
          )}

          {calendarUrls?.outlookUrl && (
            <a
              href={calendarUrls.outlookUrl}
              className="calendar-option-btn"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <span className="calendar-option-icon">📧</span>
              Outlook
            </a>
          )}
        </div>
      </div>

      {practices.length > 0 && (
        <div className="card">
          <h2 className="card-title">Upcoming Ice Show Practices</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Show</th>
                  <th>Group</th>
                  <th>Date</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {practices.map((p) => (
                  <tr key={p.id}>
                    <td>{p.show_name}</td>
                    <td>{p.group_name}</td>
                    <td>{format(new Date(p.practice_date), "EEE, MMM d, yyyy")}</td>
                    <td>
                      {p.start_time && p.end_time
                        ? `${p.start_time}–${p.end_time}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
