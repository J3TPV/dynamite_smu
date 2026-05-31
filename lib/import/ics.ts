// iCalendar (.ics) import — the universal export format from Google Calendar,
// Outlook (desktop + web) and Apple Calendar. Dependency-free RFC-5545-ish parser:
// line unfolding, VEVENT extraction, DATE vs DATE-TIME, UTC/floating/TZID times,
// DURATION, multi-day (timed + all-day) handling, EXDATE exclusions, and a bounded
// expansion of RRULEs (DAILY/WEEKLY/MONTHLY/YEARLY incl. positional BYDAY).

import { toISODate } from '../datetime';
import { CATEGORY_META, Category, Priority } from '../types';
import { ImportedEvent, IMPORT_LIMITS } from './types';

interface RawProp { name: string; params: Record<string, string>; value: string; }

/** Unfold folded lines (continuations begin with a space or tab) per RFC 5545. */
function unfold(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Parse a property line, respecting double-quoted param values (so a ':' or ';'
 *  inside a quoted param doesn't mis-split the name/value or the params). */
function parseProp(line: string): RawProp | null {
  let inQ = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQ = !inQ;
    else if (ch === ':' && !inQ) { colon = i; break; }
  }
  if (colon < 0) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);

  const segs: string[] = [];
  let cur = '';
  let q = false;
  for (const ch of left) {
    if (ch === '"') { q = !q; cur += ch; }
    else if (ch === ';' && !q) { segs.push(cur); cur = ''; }
    else cur += ch;
  }
  segs.push(cur);

  const name = segs[0].toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < segs.length; i++) {
    const eq = segs[i].indexOf('=');
    if (eq > 0) params[segs[i].slice(0, eq).toUpperCase()] = segs[i].slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name, params, value };
}

/** Unescape RFC-5545 TEXT values (\n \, \; \\). */
function unescapeText(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

interface DateTimeValue {
  dateISO: string;
  /** minutes from midnight, or null for a DATE (all-day) value */
  minutes: number | null;
  allDay: boolean;
  tzNote?: string;
}

/** Parse a date-or-datetime VALUE (without params context) to a local date + minutes. */
function parseRawDateTime(value: string, isDateParam: boolean, tzid?: string): DateTimeValue | null {
  const v = value.trim();
  const isDateOnly = isDateParam || /^\d{8}$/.test(v);
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, , z] = m;

  if (isDateOnly || hh === undefined) {
    return { dateISO: `${y}-${mo}-${d}`, minutes: null, allDay: true };
  }
  if (z === 'Z') {
    const local = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, 0));
    return { dateISO: toISODate(local), minutes: local.getHours() * 60 + local.getMinutes(), allDay: false };
  }
  const tzNote = tzid ? `Times kept as written in ${tzid}.` : undefined;
  return { dateISO: `${y}-${mo}-${d}`, minutes: +hh * 60 + +mm, allDay: false, tzNote };
}

function parseDateTime(prop: RawProp): DateTimeValue | null {
  return parseRawDateTime(prop.value, prop.params.VALUE === 'DATE', prop.params.TZID);
}

/** Parse an ISO-8601 DURATION (e.g. PT1H30M, P1DT2H, P2D) to minutes. */
function parseDuration(v: string): number | null {
  const m = v.trim().match(/^([+-]?)P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  const [, , w, d, h, min, s] = m;
  const total = (+(w || 0) * 7 * 24 * 60) + (+(d || 0) * 24 * 60) + (+(h || 0) * 60) + +(min || 0) + Math.round(+(s || 0) / 60);
  return sign * total;
}

const WEEKDAY_CODE: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const MINUTES_PER_DAY = 1440;

function isoParts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}
function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = isoParts(iso);
  return toISODate(new Date(y, m - 1, d + n));
}
function dayDiffISO(aISO: string, bISO: string): number {
  const [ay, am, ad] = isoParts(aISO);
  const [by, bm, bd] = isoParts(bISO);
  return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000);
}
function weekdayOfISO(iso: string): number {
  const [y, m, d] = isoParts(iso);
  return new Date(y, m - 1, d).getDay();
}

/** Build a date `monthsToAdd` months after the original ISO, keeping the original
 *  day-of-month. Reports overflow when the target month is too short (e.g. Jan 31
 *  + 1 month) so the caller can skip it per RFC instead of rolling forward. */
function shiftMonthsKeepingDay(origISO: string, monthsToAdd: number): { iso: string; overflow: boolean } {
  const [y, m, d] = isoParts(origISO);
  const targetIdx = (m - 1) + monthsToAdd;
  const ty = y + Math.floor(targetIdx / 12);
  const tm = ((targetIdx % 12) + 12) % 12;
  const dt = new Date(ty, tm, d);
  return { iso: toISODate(dt), overflow: dt.getMonth() !== tm };
}

/** The ISO date of the `ordinal`-th `weekday` in a given month (ordinal<0 counts
 *  from the end). Returns null when that occurrence doesn't exist that month. */
function nthWeekdayOfMonth(year: number, month0: number, weekday: number, ordinal: number): string | null {
  if (ordinal > 0) {
    const firstDow = new Date(year, month0, 1).getDay();
    const day = 1 + ((weekday - firstDow + 7) % 7) + (ordinal - 1) * 7;
    const dt = new Date(year, month0, day);
    return dt.getMonth() === month0 ? toISODate(dt) : null;
  }
  if (ordinal < 0) {
    const lastDay = new Date(year, month0 + 1, 0).getDate();
    const lastDow = new Date(year, month0, lastDay).getDay();
    const day = lastDay - ((lastDow - weekday + 7) % 7) + (ordinal + 1) * 7;
    const dt = new Date(year, month0, day);
    return day >= 1 && dt.getMonth() === month0 ? toISODate(dt) : null;
  }
  return null;
}

interface ByDay { ordinal: number; weekday: number; } // ordinal 0 = "every"
interface Rrule { freq: string; interval: number; count?: number; untilISO?: string; byday: ByDay[]; }

function parseRrule(v: string): Rrule | null {
  const parts: Record<string, string> = {};
  v.split(';').forEach(p => { const [k, val] = p.split('='); if (k && val) parts[k.toUpperCase()] = val; });
  if (!parts.FREQ) return null;

  const byday: ByDay[] = (parts.BYDAY || '').split(',').map(c => {
    const mm = c.trim().match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/i);
    if (!mm) return null;
    return { ordinal: mm[1] ? parseInt(mm[1], 10) : 0, weekday: WEEKDAY_CODE[mm[2].toUpperCase()] };
  }).filter((x): x is ByDay => x !== null);

  let untilISO: string | undefined;
  if (parts.UNTIL) {
    const um = parts.UNTIL.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
    if (um) {
      if (um[7] === 'Z' && um[4] !== undefined) {
        const local = new Date(Date.UTC(+um[1], +um[2] - 1, +um[3], +um[4], +um[5], 0));
        untilISO = toISODate(local);
      } else {
        untilISO = `${um[1]}-${um[2]}-${um[3]}`;
      }
    }
  }
  return {
    freq: parts.FREQ.toUpperCase(),
    interval: Math.max(1, parseInt(parts.INTERVAL || '1', 10) || 1),
    count: parts.COUNT ? parseInt(parts.COUNT, 10) : undefined,
    untilISO,
    byday,
  };
}

interface ExpandResult { dates: string[]; truncated: boolean; approximated: boolean; }

/** Expand a recurrence into a bounded, EXDATE-filtered list of occurrence dates. */
function expandRecurrence(startISO: string, rule: Rrule, exdates: Set<string>): ExpandResult {
  const windowEnd = addDaysISO(startISO, IMPORT_LIMITS.rruleWindowDays);
  const hardEnd = rule.untilISO && rule.untilISO < windowEnd ? rule.untilISO : windowEnd;
  const dates: string[] = [];
  let truncated = false;
  let approximated = false;
  let generated = 0; // counts toward COUNT (before EXDATE removal)

  // Returns false to stop generation.
  const consider = (iso: string): boolean => {
    if (iso > hardEnd) return false;
    if (iso < startISO) return true;
    generated++;
    if (!exdates.has(iso)) dates.push(iso);
    if (rule.count && generated >= rule.count) return false;
    if (dates.length >= IMPORT_LIMITS.rruleMaxInstances) { truncated = true; return false; }
    return true;
  };

  const weekdaySet = rule.byday.map(b => b.weekday);

  if (rule.freq === 'WEEKLY' && weekdaySet.length > 0) {
    let weekStart = addDaysISO(startISO, -((weekdayOfISO(startISO) + 6) % 7)); // Monday of start week
    outer: for (let guard = 0; guard < 800; guard++) {
      for (let dow = 0; dow < 7; dow++) {
        const iso = addDaysISO(weekStart, dow);
        if (iso < startISO) continue;
        if (weekdaySet.includes(weekdayOfISO(iso))) { if (!consider(iso)) break outer; }
      }
      weekStart = addDaysISO(weekStart, 7 * rule.interval);
      if (weekStart > hardEnd) break;
    }
  } else if ((rule.freq === 'MONTHLY' || rule.freq === 'YEARLY') && rule.byday.length > 0) {
    // Positional / weekday-in-month recurrence (e.g. "2nd Monday", "last Sunday").
    const step = rule.freq === 'YEARLY' ? 12 * rule.interval : rule.interval;
    const [sy, sm] = isoParts(startISO);
    monthsLoop: for (let k = 0; k < 1200; k++) {
      const monthIdx = (sm - 1) + k * step;
      const year = sy + Math.floor(monthIdx / 12);
      const month0 = ((monthIdx % 12) + 12) % 12;
      // Collect this period's matching dates, in ascending order.
      const inMonth: string[] = [];
      for (const b of rule.byday) {
        if (b.ordinal !== 0) {
          const iso = nthWeekdayOfMonth(year, month0, b.weekday, b.ordinal);
          if (iso) inMonth.push(iso);
        } else {
          // No ordinal → every matching weekday in the month.
          const lastDay = new Date(year, month0 + 1, 0).getDate();
          for (let day = 1; day <= lastDay; day++) {
            const dt = new Date(year, month0, day);
            if (dt.getDay() === b.weekday) inMonth.push(toISODate(dt));
          }
        }
      }
      inMonth.sort();
      for (const iso of inMonth) { if (!consider(iso)) break monthsLoop; }
      // Stop once we've walked past the window.
      if (toISODate(new Date(year, month0, 1)) > hardEnd) break;
    }
  } else if (rule.freq === 'MONTHLY' || rule.freq === 'YEARLY') {
    // Same day-of-month/year each period, computed from the ORIGINAL start so a
    // short month doesn't permanently shift later occurrences.
    if (rule.freq === 'YEARLY' && rule.byday.length > 0) approximated = true;
    const step = rule.freq === 'YEARLY' ? 12 * rule.interval : rule.interval;
    for (let k = 0; k < 1200; k++) {
      const { iso, overflow } = shiftMonthsKeepingDay(startISO, k * step);
      if (iso > hardEnd && !overflow) break;
      if (!overflow) { if (!consider(iso)) break; }
      // overflow months are skipped (RFC behavior) but still advance k
    }
  } else {
    // DAILY (and WEEKLY without BYDAY).
    const stepDays = rule.freq === 'WEEKLY' ? 7 * rule.interval : rule.interval;
    let cur = startISO;
    for (let guard = 0; guard < 2000; guard++) {
      if (rule.freq !== 'DAILY' && rule.freq !== 'WEEKLY') break; // unsupported FREQ → first only
      if (!consider(cur)) break;
      cur = addDaysISO(cur, stepDays);
      if (cur > hardEnd) break;
    }
  }

  const seen = new Set<string>();
  const ordered = dates.filter(d => (seen.has(d) ? false : (seen.add(d), true))).sort();
  return { dates: ordered, truncated, approximated };
}

function exdateToISO(token: string): string | null {
  const m = token.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return null;
  if (m[7] === 'Z' && m[4] !== undefined) {
    return toISODate(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0)));
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function parseIcs(text: string): { events: ImportedEvent[]; diagnostics: string[] } {
  const diagnostics: string[] = [];
  const lines = unfold(text);
  if (!lines.some(l => l.toUpperCase().startsWith('BEGIN:VCALENDAR'))) {
    diagnostics.push('This doesn’t look like an iCalendar file (no BEGIN:VCALENDAR).');
    return { events: [], diagnostics };
  }

  const events: ImportedEvent[] = [];
  let depth = 0;
  let inEvent = false;
  let cur: Record<string, RawProp> | null = null;
  let curExdates: string[] = [];
  let recurringCount = 0;
  let truncatedAny = false;
  let approximatedAny = false;
  let hitMaxEvents = false;
  let tzNoteSeen = false;
  let multiDayAllDay = 0;
  let skipped = 0;

  for (const line of lines) {
    if (hitMaxEvents) break;
    const upper = line.toUpperCase();
    if (upper === 'BEGIN:VEVENT') { inEvent = true; depth = 1; cur = {}; curExdates = []; continue; }
    if (inEvent && upper.startsWith('BEGIN:')) { depth++; continue; }
    if (inEvent && upper.startsWith('END:')) {
      depth--;
      if (depth > 0) continue; // closing a nested component (VALARM)
      inEvent = false;
      if (cur) emit(cur, curExdates);
      cur = null;
      continue;
    }
    if (inEvent && depth === 1 && cur) {
      const p = parseProp(line);
      if (!p) continue;
      if (p.name === 'EXDATE') {
        p.value.split(',').forEach(tok => { const iso = exdateToISO(tok); if (iso) curExdates.push(iso); });
      } else {
        cur[p.name] = p; // last value wins (fine for single-valued props)
      }
    }
  }

  function emit(props: Record<string, RawProp>, exdateList: string[]) {
    const dtstart = props.DTSTART ? parseDateTime(props.DTSTART) : null;
    if (!dtstart) { skipped++; return; }

    const title = props.SUMMARY ? unescapeText(props.SUMMARY.value).trim() || 'Untitled event' : 'Untitled event';
    const location = props.LOCATION ? unescapeText(props.LOCATION.value).trim() || undefined : undefined;
    const description = props.DESCRIPTION ? unescapeText(props.DESCRIPTION.value).trim() || undefined : undefined;
    const uidBase = props.UID ? props.UID.value.trim() : `${dtstart.dateISO}:${dtstart.minutes ?? 'allday'}:${title}`;

    // Cadence's own .ics export carries these hints so a round-trip keeps the
    // exact category/priority/done instead of re-inferring from the title.
    const catHint = props['X-CADENCE-CATEGORY']?.value.trim().toLowerCase();
    const category: Category | undefined = catHint && catHint in CATEGORY_META ? (catHint as Category) : undefined;
    const prioHint = props['X-CADENCE-PRIORITY']?.value.trim().toLowerCase();
    const priority: Priority | undefined = prioHint === 'low' || prioHint === 'medium' || prioHint === 'high' ? prioHint : undefined;
    const doneHint = props['X-CADENCE-DONE']?.value.trim();
    const done = doneHint === '1' || doneHint?.toUpperCase() === 'TRUE' ? true : undefined;

    const warnings: string[] = [];
    if (dtstart.tzNote) { warnings.push(dtstart.tzNote); tzNoteSeen = true; }

    let duration = 0;
    const dtend = props.DTEND ? parseDateTime(props.DTEND) : null;

    if (!dtstart.allDay) {
      if (dtend && !dtend.allDay && dtend.minutes != null && dtstart.minutes != null) {
        const raw = dayDiffISO(dtstart.dateISO, dtend.dateISO) * MINUTES_PER_DAY + (dtend.minutes - dtstart.minutes);
        if (raw <= 0) duration = 0;
        else if (raw > MINUTES_PER_DAY) { warnings.push('Multi-day event imported as a block on its start day.'); duration = MINUTES_PER_DAY - dtstart.minutes; }
        else duration = raw;
      } else if (props.DURATION) {
        const parsed = parseDuration(props.DURATION.value) ?? 0;
        if (parsed > MINUTES_PER_DAY && dtstart.minutes != null) { warnings.push('Multi-day event imported as a block on its start day.'); duration = MINUTES_PER_DAY - dtstart.minutes; }
        else duration = Math.max(0, parsed);
      }
    }

    // --- Build the list of occurrence dates ---
    let dates = [dtstart.dateISO];

    // All-day events may span multiple days (Google's DTEND is exclusive).
    if (dtstart.allDay && dtend && dtend.allDay) {
      const span = dayDiffISO(dtstart.dateISO, dtend.dateISO); // exclusive end → span = #days
      if (span > 1) {
        const capped = Math.min(span, IMPORT_LIMITS.rruleMaxInstances);
        dates = Array.from({ length: capped }, (_, i) => addDaysISO(dtstart.dateISO, i));
        multiDayAllDay++;
        if (capped < span) truncatedAny = true;
      }
    }

    // Recurrence (overrides the single/all-day-span list above).
    const rule = props.RRULE ? parseRrule(props.RRULE.value) : null;
    if (rule) {
      const ex = expandRecurrence(dtstart.dateISO, rule, new Set(exdateList));
      if (ex.dates.length >= 1) {
        dates = ex.dates;
        if (ex.dates.length > 1) {
          recurringCount++;
          warnings.push(`Recurring event — expanded to ${ex.dates.length} occurrence${ex.dates.length > 1 ? 's' : ''}.`);
        }
        if (ex.truncated) truncatedAny = true;
        if (ex.approximated) { approximatedAny = true; warnings.push('Recurrence pattern approximated.'); }
      }
    }

    for (const dateISO of dates) {
      events.push({
        title,
        dateISO,
        start: dtstart.allDay ? null : dtstart.minutes,
        duration,
        allDay: dtstart.allDay,
        location,
        description,
        warnings: [...warnings],
        uid: dates.length > 1 ? `${uidBase}@${dateISO}` : uidBase,
        category,
        priority,
        done,
      });
      if (events.length >= IMPORT_LIMITS.maxEvents) { hitMaxEvents = true; return; }
    }
  }

  if (skipped > 0) diagnostics.push(`Skipped ${skipped} event${skipped > 1 ? 's' : ''} with no readable start date.`);
  if (recurringCount > 0) diagnostics.push(`Expanded ${recurringCount} recurring event${recurringCount > 1 ? 's' : ''} across the next ${IMPORT_LIMITS.rruleWindowDays} days.`);
  if (multiDayAllDay > 0) diagnostics.push(`Expanded ${multiDayAllDay} multi-day all-day event${multiDayAllDay > 1 ? 's' : ''} into per-day entries.`);
  if (approximatedAny) diagnostics.push('Some complex recurrence rules (e.g. yearly by weekday) were approximated to the closest date pattern.');
  if (truncatedAny) diagnostics.push(`Some recurring/multi-day series were capped at ${IMPORT_LIMITS.rruleMaxInstances} occurrences each.`);
  if (hitMaxEvents) diagnostics.push(`Reached the ${IMPORT_LIMITS.maxEvents}-event limit — later events were not imported.`);
  if (tzNoteSeen) diagnostics.push('Some events specified a timezone — their times were kept exactly as written (not shifted to your local zone).');
  return { events, diagnostics };
}
