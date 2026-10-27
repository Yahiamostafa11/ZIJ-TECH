/**
 * Cairo wall-clock helpers. Sessions are stored as UTC instants; staff enter
 * and read them in Cairo time, which observes daylight saving time.
 */

const TIME_ZONE = "Africa/Cairo";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Cairo calendar date and time of an instant. */
export function cairoParts(instant: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(instant).map((part) => [part.type, part.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    date,
    time: `${parts.hour}:${parts.minute}`,
    month: date.slice(0, 7),
    weekday: weekdayOf(date),
    seconds: Number(parts.second),
  };
}

/** Minutes Cairo is ahead of UTC at the given instant. */
function cairoOffsetMinutes(instant: Date) {
  const parts = cairoParts(instant);
  const [year, month, day] = parts.date.split("-").map(Number);
  const [hour, minute] = parts.time.split(":").map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, parts.seconds);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** The UTC instant of a Cairo wall-clock date (YYYY-MM-DD) and time (HH:MM). */
export function cairoToUtc(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes settle the offset across a daylight saving change.
  let instant = new Date(naive - cairoOffsetMinutes(new Date(naive)) * 60000);
  instant = new Date(naive - cairoOffsetMinutes(instant) * 60000);
  return instant;
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD date. */
export function weekdayOf(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** UTC bounds [start, end) of a Cairo calendar month given as YYYY-MM. */
export function cairoMonthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const next = monthIndex === 12 ? `${year + 1}-01` : `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return { start: cairoToUtc(`${month}-01`, "00:00"), end: cairoToUtc(`${next}-01`, "00:00") };
}

/** The `count` months ending with `month`, oldest first, as YYYY-MM. */
export function recentMonths(month: string, count: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const offset = monthIndex - 1 - (count - 1 - index);
    const y = year + Math.floor(offset / 12);
    const m = ((offset % 12) + 12) % 12;
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  });
}

type Slot = { weekday: number; startTime: string; durationMinutes: number };

/**
 * Meeting times for `count` sessions starting on `startDate`, following the
 * weekly slots in calendar order. Returns fewer when no slot ever matches.
 */
export function scheduleSessions(startDate: string, slots: Slot[], count: number) {
  const ordered = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const result: { scheduledAt: Date; durationMinutes: number }[] = [];
  if (ordered.length === 0 || count <= 0) return result;

  for (let offset = 0; result.length < count && offset < 7 * (count + 1); offset += 1) {
    const date = addDays(startDate, offset);
    const weekday = weekdayOf(date);
    for (const slot of ordered) {
      if (slot.weekday !== weekday || result.length >= count) continue;
      result.push({ scheduledAt: cairoToUtc(date, slot.startTime.slice(0, 5)), durationMinutes: slot.durationMinutes });
    }
  }
  return result;
}

/** International form of an Egyptian mobile number for wa.me links (01x… → 201x…). */
export function whatsappNumber(phone: string) {
  return phone.startsWith("0") ? `20${phone.slice(1)}` : phone;
}
