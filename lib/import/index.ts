// Calendar import entry point: detect the file format, parse it into normalized
// events, map those onto Cadence's PlanEvent model (reusing the voice parser's
// category inference), and flag duplicates against what's already scheduled.

import { PlanEvent } from '../types';
import { classifyText } from '../parser';
import { newId } from '../storage';
import { CalendarFormat, ImportedEvent, ImportResult, ImportRow, IMPORT_LIMITS } from './types';
import { parseCsv } from './csv';
import { parseIcs } from './ics';

export type { CalendarFormat, ImportResult, ImportRow } from './types';
export { IMPORT_LIMITS } from './types';

/** Guess the calendar format from filename, then fall back to content sniffing. */
export function detectFormat(filename: string, content: string): CalendarFormat {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (ext === 'ics' || ext === 'ical' || ext === 'ifb' || ext === 'vcs') return 'ics';
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'pst' || ext === 'ost') return 'pst';

  const head = content.slice(0, 512);
  if (head.charCodeAt(0) === 0x21 && head.slice(0, 4) === '!BDN') return 'pst'; // PST magic
  if (/BEGIN:VCALENDAR/i.test(head)) return 'ics';
  if (/(^|\n)[^\n]*\b(subject|title|start date|start time)\b/i.test(head) && head.includes(',')) return 'csv';
  return 'unknown';
}

const PST_GUIDANCE = [
  '.pst / .ost are Outlook’s proprietary binary archives and can’t be read in the browser.',
  'In Outlook (desktop): open Calendar → File → Save Calendar → save as iCalendar (.ics), then drop that file here.',
  'In Outlook on the web: Settings → Calendar → “Export” to download an .ics file.',
  'Alternatively export to CSV (File → Open & Export → Import/Export → Export to a file → Comma Separated Values).',
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// Keep imported free-text bounded so a crafted/huge field can't bloat localStorage.
const MAX_TITLE = 300;
const MAX_TEXT = 2000;
const clamp = (s: string | undefined, max: number): string | undefined =>
  s == null ? undefined : (s.length > max ? s.slice(0, max) + '…' : s);

/** Map a normalized imported event onto a draft PlanEvent. */
function toPlanEvent(ev: ImportedEvent, sourceName: string): PlanEvent {
  const klass = classifyText([ev.title, ev.description, ev.location].filter(Boolean).join(' '));
  let start = ev.start ?? 0;
  let duration = ev.duration;
  if (!ev.allDay && duration <= 0) {
    duration = klass.defaultDuration ?? 60; // fill in unknown durations sensibly
  }
  if (ev.allDay) { start = 0; duration = 0; }

  return {
    id: newId(),
    title: clamp(ev.title, MAX_TITLE) || 'Untitled event',
    date: ev.dateISO,
    start,
    duration,
    // Cadence-exported files carry exact hints; foreign files fall back to NLP classification.
    category: ev.category ?? klass.category,
    priority: ev.priority ?? 'medium',
    done: ev.done ?? false,
    createdVia: 'import',
    source: `Imported from ${sourceName}`,
    allDay: ev.allDay || undefined,
    location: clamp(ev.location, MAX_TEXT),
    description: clamp(ev.description, MAX_TEXT),
    importUid: ev.uid,
  };
}

function isDuplicate(draft: PlanEvent, existing: PlanEvent[]): boolean {
  return existing.some(e => {
    // Prefer a stable source identity when both sides carry one.
    if (e.importUid && draft.importUid) return e.importUid === draft.importUid;
    return (
      e.date === draft.date &&
      !!e.allDay === !!draft.allDay &&
      (draft.allDay || e.start === draft.start) &&
      norm(e.title) === norm(draft.title)
    );
  });
}

/**
 * Parse an uploaded calendar file into a reviewable import result.
 * `existing` is the current calendar, used purely to flag likely duplicates.
 */
export function parseCalendarFile(
  filename: string,
  content: string,
  existing: PlanEvent[],
): ImportResult {
  const format = detectFormat(filename, content);
  const base: ImportResult = { format, sourceName: filename, rows: [], diagnostics: [], empty: true };

  if (format === 'pst') {
    return { ...base, diagnostics: PST_GUIDANCE };
  }

  let parsed: { events: ImportedEvent[]; diagnostics: string[] };
  if (format === 'ics') parsed = parseIcs(content);
  else if (format === 'csv') parsed = parseCsv(content);
  else {
    return {
      ...base,
      diagnostics: ['Unrecognized file. Cadence imports iCalendar (.ics) and CSV exports from Google Calendar, Outlook and Apple Calendar.'],
    };
  }

  // Both parsers cap at IMPORT_LIMITS.maxEvents internally and emit their own
  // "reached the limit" diagnostic; this slice is just a defensive safety net.
  const diagnostics = [...parsed.diagnostics];
  const events = parsed.events.slice(0, IMPORT_LIMITS.maxEvents);

  const existingPlusBatch: PlanEvent[] = [...existing];
  const rows: ImportRow[] = events.map(ev => {
    const draft = toPlanEvent(ev, filename);
    // Dedup against the existing calendar *and* earlier rows in this same file.
    const duplicate = isDuplicate(draft, existingPlusBatch);
    existingPlusBatch.push(draft);
    return { draft, selected: !duplicate, warnings: ev.warnings, duplicate };
  });

  const dupCount = rows.filter(r => r.duplicate).length;
  if (dupCount > 0) diagnostics.push(`${dupCount} event${dupCount > 1 ? 's' : ''} already on your calendar — left unchecked.`);

  return {
    format,
    sourceName: filename,
    rows,
    diagnostics,
    empty: rows.length === 0,
  };
}
