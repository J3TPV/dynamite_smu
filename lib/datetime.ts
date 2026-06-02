// Small, dependency-free date/time helpers. All dates are handled in local time.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** Start of the week containing `d`. `weekStartsOn`: 0=Sunday, 1=Monday (default). */
export function startOfWeek(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day - weekStartsOn + 7) % 7; // days since the week's start
  return addDays(stripTime(d), -diff);
}

export function addMonths(d: Date, n: number): Date {
  // Clamp the day to the last valid day of the target month so e.g. May 31 + 1
  // lands on June 30 instead of overflowing into July (skipping a month).
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function monthYearLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** The 42 days (6 weeks) covering the month of `d`, aligned to `weekStartsOn`. */
export function monthGridDays(d: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const first = startOfMonth(d);
  const gridStart = startOfWeek(first, weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** Short weekday names ordered for the given week start. */
export function weekdayHeaders(weekStartsOn: 0 | 1 = 1): string[] {
  const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => base[(i + weekStartsOn) % 7]);
}

export function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function minutesToLabel(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function durationToLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${h}h ${m}m`;
}

export function weekdayShort(d: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

export function weekdayLong(d: Date): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
}

export function monthDay(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function isSameISO(a: string, b: string): boolean {
  return a === b;
}

/** Whether `iso` falls within [startISO, endISO] inclusive. Safe lexicographic
 *  compare since all values are zero-padded YYYY-MM-DD. */
export function isoInRange(iso: string, startISO: string, endISO: string): boolean {
  return iso >= startISO && iso <= endISO;
}

/** Whether an all-day/multi-day event covers a given calendar day. */
export function eventCoversDate(e: { date: string; endDate?: string }, iso: string): boolean {
  return isoInRange(iso, e.date, e.endDate ?? e.date);
}

export function relativeDayLabel(iso: string, today: Date): string {
  const target = fromISODate(iso);
  const diff = Math.round((stripTime(target).getTime() - stripTime(today).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return weekdayLong(target);
  return monthDay(target);
}
