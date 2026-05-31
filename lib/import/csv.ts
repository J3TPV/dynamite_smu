// CSV calendar import. Handles the exports produced by Google Calendar and
// Outlook (desktop + web), Apple Calendar, plus reasonably generic CSV/TSV and
// semicolon-delimited locale exports. Dependency-free: an RFC-4180-ish tokenizer
// with delimiter sniffing + fuzzy column detection so we don't rely on an exact
// header order from any one vendor.

import { fromISODate, toISODate } from '../datetime';
import { ImportedEvent, IMPORT_LIMITS } from './types';

const MINUTES_PER_DAY = 1440;

/** Tokenize CSV/TSV text into rows of fields. Handles quotes, "" escapes,
 *  embedded delimiters/newlines, CR/LF/CRLF, and a configurable delimiter. */
export function tokenizeCsv(input: string, delimiter = ','): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let started = false; // have we seen any char on the current logical row?

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; started = false; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; started = true; continue; }
    if (c === delimiter) { pushField(); started = true; continue; }
    if (c === '\r') { if (text[i + 1] === '\n') i++; pushRow(); continue; }
    if (c === '\n') { pushRow(); continue; }
    field += c;
    started = true;
  }
  // Flush the final field/row unless the file ended on a clean newline.
  if (started || field.length > 0 || row.length > 0) pushRow();
  // Drop fully-empty trailing rows.
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

/** Guess the field delimiter from the header line (handles comma/semicolon/tab). */
function sniffDelimiter(text: string): string {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const first = body.split(/\r?\n/, 1)[0] || '';
  const count = (ch: string) => first.split(ch).length - 1;
  const candidates: Array<[string, number]> = [[',', count(',')], [';', count(';')], ['\t', count('\t')]];
  candidates.sort((a, b) => b[1] - a[1]);
  return candidates[0][1] > 0 ? candidates[0][0] : ',';
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_.-]+/g, ' ').trim();

interface ColMap {
  subject: number;
  startDate: number;
  startTime: number;
  endDate: number;
  endTime: number;
  start: number;   // combined "date time" column
  end: number;
  allDay: number;
  location: number;
  description: number;
}

function findColumns(header: string[]): ColMap {
  const h = header.map(norm);
  const find = (pred: (x: string) => boolean) => h.findIndex(pred);
  return {
    subject: find(x => x === 'subject' || x === 'title' || x === 'summary' || x === 'event' || x === 'name' || x === 'what'),
    startDate: find(x => x === 'start date' || x === 'begin date' || x === 'date'),
    startTime: find(x => x === 'start time' || x === 'begin time' || x === 'time'),
    endDate: find(x => x === 'end date' || x === 'finish date'),
    endTime: find(x => x === 'end time' || x === 'finish time'),
    start: find(x => x === 'start' || x === 'starts' || x === 'start datetime' || x === 'start date time'),
    end: find(x => x === 'end' || x === 'ends' || x === 'end datetime' || x === 'end date time'),
    allDay: find(x => x === 'all day event' || x === 'all day' || x === 'allday' || x === 'is all day'),
    location: find(x => x === 'location' || x === 'where' || x === 'place'),
    description: find(x => x === 'description' || x === 'notes' || x === 'note' || x === 'body' || x === 'details'),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

type DateOrder = 'mdy' | 'dmy';

/** Inspect a column of numeric dates and decide month-first vs day-first.
 *  Returns the order plus whether any genuinely ambiguous (both parts ≤12) date appeared. */
function detectDateOrder(cells: string[]): { order: DateOrder; ambiguous: boolean; decisive: boolean } {
  let dmy = false, mdy = false, ambiguous = false;
  for (const raw of cells) {
    const m = (raw || '').trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.]\d{2,4}/);
    if (!m) continue;
    const a = +m[1], b = +m[2];
    if (a > 12 && b <= 12) dmy = true;        // first part can only be a day
    else if (b > 12 && a <= 12) mdy = true;   // second part can only be a day
    else if (a <= 12 && b <= 12) ambiguous = true;
  }
  const decisive = dmy !== mdy; // exactly one of the two is supported by evidence
  const order: DateOrder = dmy && !mdy ? 'dmy' : 'mdy'; // default/ tie → US month-first
  return { order, ambiguous, decisive };
}

/** Parse a date cell to ISO YYYY-MM-DD. `order` disambiguates numeric M/D vs D/M. */
export function parseDateCell(raw: string, order: DateOrder = 'mdy'): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const mo = +m[2], d = +m[3];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${m[1]}-${pad(mo)}-${pad(d)}`;
  }

  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let mo: number, d: number;
    if (order === 'dmy') { d = +m[1]; mo = +m[2]; } else { mo = +m[1]; d = +m[2]; }
    let y = +m[3];
    if (y < 100) y += 2000;
    // Safety: if the chosen order is impossible but the other works, swap.
    if (mo > 12 && d <= 12) { const t = mo; mo = d; d = t; }
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad(mo)}-${pad(d)}`;
    return null;
  }

  // "June 1, 2026" / "Jun 1 2026" / "1 June 2026"
  m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (m) {
    const key = m[1].toLowerCase().slice(0, m[1].toLowerCase().startsWith('sept') ? 4 : 3);
    if (MONTHS[key]) return `${m[3]}-${pad(MONTHS[key])}-${pad(+m[2])}`;
  }
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\.?,?\s+(\d{4})/);
  if (m) {
    const key = m[2].toLowerCase().slice(0, m[2].toLowerCase().startsWith('sept') ? 4 : 3);
    if (MONTHS[key]) return `${m[3]}-${pad(MONTHS[key])}-${pad(+m[1])}`;
  }

  // Last resort: let the engine try, then re-localize.
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return toISODate(dt);
  return null;
}

/** Parse a time cell to minutes from midnight. Requires real time structure —
 *  a colon (H:MM[:SS]) or an explicit meridiem (H am/pm) — so stray text/numbers
 *  like "Room 5" don't fabricate a time. Returns null when there's no time. */
export function parseTimeCell(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?$/i)
    || s.match(/^(\d{1,2})()\s*([ap]\.?m\.?)$/i);
  if (!m) return null;
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  const mer = m[3] ? m[3].toLowerCase().replace(/\./g, '') : '';
  if (mer === 'pm' && h < 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Split a combined "date time" cell into its date and time halves. */
function splitDateTime(cell: string, order: DateOrder): { date: string | null; time: number | null } {
  const s = (cell || '').trim();
  if (!s) return { date: null, time: null };
  const date = parseDateCell(s, order);
  const timeMatch = s.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*[ap]\.?m\.?|\d{1,2}:\d{2}(?::\d{2})?|\d{1,2}\s*[ap]\.?m\.?)\s*$/i);
  const time = timeMatch ? parseTimeCell(timeMatch[1]) : null;
  return { date, time };
}

const truthy = (s: string) => /^(true|yes|y|1|on|all day)$/i.test((s || '').trim());

function dayDiff(aISO: string, bISO: string): number {
  return Math.round((fromISODate(bISO).getTime() - fromISODate(aISO).getTime()) / 86400000);
}

export function parseCsv(text: string): { events: ImportedEvent[]; diagnostics: string[] } {
  const diagnostics: string[] = [];
  const delimiter = sniffDelimiter(text);
  const rows = tokenizeCsv(text, delimiter);
  if (rows.length < 2) {
    diagnostics.push('No data rows found in the CSV (expected a header row plus events).');
    return { events: [], diagnostics };
  }

  const cols = findColumns(rows[0]);
  if (cols.subject < 0) {
    diagnostics.push('Couldn’t find a “Subject”/“Title” column — is this a calendar CSV? Expected headers like Subject, Start Date, Start Time.');
    return { events: [], diagnostics };
  }
  const hasStart = cols.startDate >= 0 || cols.start >= 0;
  if (!hasStart) {
    diagnostics.push('Couldn’t find a start date column (e.g. “Start Date” or “Start”).');
    return { events: [], diagnostics };
  }

  // Decide month-first vs day-first from the whole start-date column up front.
  const dateColIdx = cols.startDate >= 0 ? cols.startDate : cols.start;
  const dateCells = rows.slice(1).map(r => (dateColIdx < r.length ? r[dateColIdx] : ''));
  const { order, ambiguous, decisive } = detectDateOrder(dateCells);
  if (ambiguous && !decisive) {
    diagnostics.push('Some dates were ambiguous (e.g. 03/04/2026) — assumed US month/day order. Double-check imported dates.');
  } else if (decisive && order === 'dmy') {
    diagnostics.push('Detected day/month/year date order from the file.');
  }

  const events: ImportedEvent[] = [];
  let skipped = 0;
  let truncated = false;

  for (let r = 1; r < rows.length; r++) {
    if (events.length >= IMPORT_LIMITS.maxEvents) { truncated = true; break; }
    const row = rows[r];
    const cell = (i: number) => (i >= 0 && i < row.length ? row[i].trim() : '');
    const title = cell(cols.subject) || 'Untitled event';

    // --- Resolve start date + time (separate or combined columns) ---
    let startDate: string | null = null;
    let startTime: number | null = null;
    if (cols.startDate >= 0) {
      startDate = parseDateCell(cell(cols.startDate), order);
      startTime = cols.startTime >= 0 ? parseTimeCell(cell(cols.startTime)) : null;
    } else if (cols.start >= 0) {
      const dt = splitDateTime(cell(cols.start), order);
      startDate = dt.date;
      startTime = dt.time;
    }
    if (!startDate) { skipped++; continue; }

    // --- Resolve end date + time ---
    let endDate: string | null = null;
    let endTime: number | null = null;
    if (cols.endDate >= 0) {
      endDate = parseDateCell(cell(cols.endDate), order);
      endTime = cols.endTime >= 0 ? parseTimeCell(cell(cols.endTime)) : null;
    } else if (cols.end >= 0) {
      const dt = splitDateTime(cell(cols.end), order);
      endDate = dt.date;
      endTime = dt.time;
    }

    const allDayFlag = cols.allDay >= 0 && truthy(cell(cols.allDay));
    const allDay = allDayFlag || startTime === null;

    const warnings: string[] = [];
    let duration = 0;

    if (!allDay) {
      // Only compute a duration when we have a real end time; a missing end time
      // means "unknown" → the mapper applies a sensible default (don't synthesize).
      if (endTime != null) {
        const eDate = endDate || startDate;
        const endAbs = dayDiff(startDate, eDate) * MINUTES_PER_DAY + endTime;
        const raw = endAbs - startTime!;
        if (raw <= 0) {
          duration = 0; // non-positive / same-instant → default
        } else if (raw > MINUTES_PER_DAY) {
          // Genuinely spans more than 24h — clamp to the start day and flag it.
          warnings.push('Multi-day event imported as a block on its start day.');
          duration = MINUTES_PER_DAY - startTime!;
        } else {
          duration = raw; // normal same-day OR overnight event — keep the real length
        }
      }
    } else if (endDate && dayDiff(startDate, endDate) > 1) {
      // Google marks the day *after* the last day as the end, so >1 means it truly spans days.
      warnings.push('Multi-day all-day event imported on its start date.');
    }

    events.push({
      title,
      dateISO: startDate,
      start: allDay ? null : startTime,
      duration,
      allDay,
      location: cols.location >= 0 ? cell(cols.location) || undefined : undefined,
      description: cols.description >= 0 ? cell(cols.description) || undefined : undefined,
      warnings,
      uid: `csv:${startDate}:${startTime ?? 'allday'}:${title}`,
    });
  }

  if (skipped > 0) diagnostics.push(`Skipped ${skipped} row${skipped > 1 ? 's' : ''} with no readable start date.`);
  if (truncated) diagnostics.push(`Reached the ${IMPORT_LIMITS.maxEvents}-event limit — later rows were not imported.`);
  return { events, diagnostics };
}
