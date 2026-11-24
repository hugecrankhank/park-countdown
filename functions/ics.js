// Cloudflare Pages Function: GET /ics?title=...&start=YYYYMMDDTHHMMSSZ&mins=30&desc=...&uid=...
// Returns a real calendar file so iPhone shows its own "Add to Calendar" screen.
// Alerts: the day before, 15 minutes before, and at the start time.

const esc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = line => {                       // calendar lines must wrap at 75 bytes
  const out = []; let cur = "", bytes = 0;
  for (const ch of line){
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > 74){ out.push(cur); cur = " "; bytes = 1; }
    cur += ch; bytes += b;
  }
  out.push(cur); return out.join("\r\n");
};
const stamp = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function onRequestGet({ request }){
  const q = new URL(request.url).searchParams;
  const start = q.get("start") || "";
  const m = start.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return new Response("Missing or bad start time", { status: 400 });
  const startDate = new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  const mins = Math.min(Math.max(parseInt(q.get("mins") || "30", 10) || 30, 5), 24 * 60);
  const title = (q.get("title") || "Reminder").slice(0, 200);
  const desc = (q.get("desc") || "").slice(0, 1000);
  const uid = (q.get("uid") || stamp(startDate)).replace(/[^A-Za-z0-9._-]/g, "").slice(0, 80) + "@park-countdown";

  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Park Day Countdown//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(startDate)}`, `DTEND:${stamp(new Date(startDate.getTime() + mins * 60000))}`,
    `SUMMARY:${esc(title)}`, ...(desc ? [`DESCRIPTION:${esc(desc)}`] : []),
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Opens tomorrow", "TRIGGER:-P1D", "END:VALARM",
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Opens in 15 minutes", "TRIGGER:-PT15M", "END:VALARM",
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Open now", "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="reminder.ics"',
      "cache-control": "no-store",
    },
  });
}
