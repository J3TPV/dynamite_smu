// iCalendar (.ics) export — the inverse of lib/import/ics.ts. Produces a
// dependency-free, RFC-5545 VCALENDAR string that (a) opens in Google / Outlook
// / Apple Calendar and (b) re-imports cleanly into Cadence, preserving each
// event's category, priority and done-state via X-CADENCE-* hints the importer
// honours. Completes the migration round-trip (we already import these formats).

import { CATEGORY_META, PlanEvent } from '../types';
import { addDays, fromISODate, toISODate } from '../datetime';

const PRODID = '-//Cadence//Voice Calendar Planner//EN';

const pad = (n: number): string => String(n).padStart(2, '0');

/** Escape an RFC-5545 TEXT value: backslash, semicolon, comma and newlines. */
function escapeText(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** UTF-8 byte length of a single code point's worth of text. */
function utf8Len(ch: string): number {
  const c = ch.codePointAt(0)!;
  return c <= 0x7f ? 1 : c <= 0x7ff ? 2 : c <= 0xffff ? 3 : 4;
}

/**
 * Fold a content line to ≤75 octets per RFC 5545. Continuation lines begin with
 * a single space (which counts toward the 75). Folds on code-point boundaries so
 * a multi-byte character (e.g. an emoji) is never split across the wrap.
 */
function foldLine(line: string): string {
  const MAX = 75;
  let out = '';
  let bytes = 0;
  for (const ch of line) {
    const b = utf8Len(ch);
    if (bytes + b > MAX) {
      out += '\r\n ';
      bytes = 1; // the inserted leading space
    }
    out += ch;
    bytes += b;
  }
  return out;
}

/** YYYYMMDD for an all-day DATE value. */
function dateValue(iso: string): string {
  return iso.replace(/-/g, '');
}

/** YYYYMMDDTHHMMSS floating (local, no Z) date-time from an ISO date + minutes. */
function dateTimeValue(iso: string, minutes: number): string {
  const dayOffset = Math.floor(minutes / 1440);
  const mins = ((minutes % 1440) + 1440) % 1440;
  const dateISO = dayOffset === 0 ? iso : toISODate(addDays(fromISODate(iso), dayOffset));
  return `${dateValue(dateISO)}T${pad(Math.floor(mins / 60))}${pad(mins % 60)}00`;
}

/** UTC basic-format timestamp (YYYYMMDDTHHMMSSZ) for DTSTAMP. */
function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export interface IcsExportOptions {
  /** Override the DTSTAMP (UTC basic format). Tests pass a fixed value. */
  dtstamp?: string;
  /** Clock used to derive DTSTAMP when not given explicitly. */
  now?: Date;
}

/** Stable UID for a Cadence event: reuse an imported UID, else synthesize one. */
function eventUid(e: PlanEvent): string {
  return e.importUid || `${e.id}@cadence.local`;
}

function buildVevent(e: PlanEvent, dtstamp: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeText(eventUid(e))}`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${escapeText(e.title)}`,
  ];

  if (e.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${dateValue(e.date)}`);
    // DTEND is exclusive for all-day events → the following day.
    lines.push(`DTEND;VALUE=DATE:${dateValue(toISODate(addDays(fromISODate(e.date), 1)))}`);
  } else {
    lines.push(`DTSTART:${dateTimeValue(e.date, e.start)}`);
    if (e.duration > 0) lines.push(`DTEND:${dateTimeValue(e.date, e.start + e.duration)}`);
  }

  if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
  if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);

  // Human-facing category for foreign calendars, plus exact round-trip hints.
  lines.push(`CATEGORIES:${escapeText(CATEGORY_META[e.category]?.label ?? e.category)}`);
  lines.push(`X-CADENCE-CATEGORY:${e.category}`);
  lines.push(`X-CADENCE-PRIORITY:${e.priority}`);
  if (e.done) lines.push('X-CADENCE-DONE:1');

  lines.push('END:VEVENT');
  return lines;
}

/** Serialize a list of Cadence events into a complete iCalendar document. */
export function eventsToIcs(events: PlanEvent[], opts: IcsExportOptions = {}): string {
  const dtstamp = opts.dtstamp ?? utcStamp(opts.now ?? new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
  ];
  for (const e of events) lines.push(...buildVevent(e, dtstamp));
  lines.push('END:VCALENDAR');

  // RFC 5545 mandates CRLF line endings; fold each logical line first.
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Suggested download filename, e.g. cadence-2026-05-31.ics. */
export function icsFilename(now: Date = new Date()): string {
  return `cadence-${toISODate(now)}.ics`;
}
