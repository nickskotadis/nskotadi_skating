/**
 * Generates individual class meeting dates from a session's recurring schedule.
 *
 * Pure function — no DB access. Called when a session is created to
 * bulk-insert rows into the class_dates table.
 */

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export type ClassDateRow = {
  class_date: string;   // YYYY-MM-DD
  start_time: string;   // HH:MM
  end_time: string;     // HH:MM
};

export function generateClassDates(params: {
  seasonStart: string;  // YYYY-MM-DD
  seasonEnd: string;    // YYYY-MM-DD
  dayOfWeek: string;    // e.g. "tuesday"
  startTime: string;    // HH:MM
  endTime: string;      // HH:MM
}): ClassDateRow[] {
  const { seasonStart, seasonEnd, dayOfWeek, startTime, endTime } = params;

  const targetDay = DAY_INDEX[dayOfWeek.toLowerCase()];
  if (targetDay === undefined) {
    throw new Error(`Invalid dayOfWeek: ${dayOfWeek}`);
  }

  const results: ClassDateRow[] = [];

  // Start from seasonStart and advance to the first occurrence of targetDay
  const start = new Date(`${seasonStart}T00:00:00`);
  const end = new Date(`${seasonEnd}T00:00:00`);

  // Find first matching weekday on or after seasonStart
  const current = new Date(start);
  const diff = (targetDay - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + diff);

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");

    results.push({
      class_date: `${yyyy}-${mm}-${dd}`,
      start_time: startTime,
      end_time: endTime,
    });

    current.setDate(current.getDate() + 7);
  }

  return results;
}
