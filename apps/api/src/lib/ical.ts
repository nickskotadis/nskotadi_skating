export type ICalEvent = {
  uid: string;
  summary: string;
  description?: string;
  dtstart: string; // YYYY-MM-DD
  startTime?: string; // HH:MM — if absent, treat as all-day
  endTime?: string;   // HH:MM
  location?: string;
};

function foldLine(line: string): string {
  // RFC 5545 line folding: max 75 octets, continuation lines start with a space
  if (line.length <= 75) return line;
  const result: string[] = [];
  let pos = 0;
  result.push(line.slice(pos, 75));
  pos = 75;
  while (pos < line.length) {
    result.push(" " + line.slice(pos, pos + 74));
    pos += 74;
  }
  return result.join("\r\n");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toDateString(date: string): string {
  // YYYY-MM-DD → YYYYMMDD
  return date.replace(/-/g, "");
}

function toDateTimeString(date: string, time: string): string {
  // YYYY-MM-DD + HH:MM → YYYYMMDDTHHmmss
  const d = date.replace(/-/g, "");
  const t = time.replace(/:/g, "") + "00";
  return `${d}T${t}`;
}

function addOneDay(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function buildIcalFeed(events: ICalEvent[], calName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//SkateTrack//SkateTrack Calendar//EN`,
    `X-WR-CALNAME:${escapeText(calName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    const isAllDay = !event.startTime;

    let dtstart: string;
    let dtend: string;

    if (isAllDay) {
      dtstart = `DTSTART;VALUE=DATE:${toDateString(event.dtstart)}`;
      dtend = `DTEND;VALUE=DATE:${toDateString(addOneDay(event.dtstart))}`;
    } else {
      dtstart = `DTSTART:${toDateTimeString(event.dtstart, event.startTime!)}`;
      const endTime = event.endTime ?? event.startTime!;
      dtend = `DTEND:${toDateTimeString(event.dtstart, endTime)}`;
    }

    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${event.uid}`));
    lines.push(foldLine(`SUMMARY:${escapeText(event.summary)}`));
    if (event.description) lines.push(foldLine(`DESCRIPTION:${escapeText(event.description)}`));
    lines.push(dtstart);
    lines.push(dtend);
    if (event.location) lines.push(foldLine(`LOCATION:${escapeText(event.location)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
