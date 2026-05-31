// Tests for .ics export (lib/export/ics.ts) and its round-trip back through the
// importer — exporting then re-importing must preserve the schedule faithfully.

import { test, eq, assert } from './_harness';
import { eventsToIcs, icsFilename } from '../lib/export/ics';
import { parseCalendarFile } from '../lib/import/index';
import { PlanEvent } from '../lib/types';

function ev(extra: Partial<PlanEvent>): PlanEvent {
  return {
    id: 'id-' + (extra.id ?? Math.abs(hash(JSON.stringify(extra)))),
    title: 'Event', date: '2026-01-05', start: 9 * 60, duration: 60,
    category: 'work', priority: 'medium', done: false, createdVia: 'manual', ...extra,
  };
}
// Tiny deterministic hash so generated ids are stable without Math.random in a loop.
function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

const STAMP = '20260101T000000Z';

test('eventsToIcs wraps events in a VCALENDAR with CRLF endings', () => {
  const ics = eventsToIcs([ev({ id: 'a' })], { dtstamp: STAMP });
  assert(ics.startsWith('BEGIN:VCALENDAR\r\n'), 'starts with VCALENDAR + CRLF');
  assert(ics.includes('VERSION:2.0'), 'has VERSION');
  assert(ics.trimEnd().endsWith('END:VCALENDAR'), 'ends with END:VCALENDAR');
  assert(ics.includes('BEGIN:VEVENT') && ics.includes('END:VEVENT'), 'has a VEVENT');
});

test('eventsToIcs emits floating DTSTART/DTEND for a timed event', () => {
  const ics = eventsToIcs([ev({ id: 'a', start: 9 * 60, duration: 90 })], { dtstamp: STAMP });
  assert(ics.includes('DTSTART:20260105T090000'), 'DTSTART at 09:00 local');
  assert(ics.includes('DTEND:20260105T103000'), 'DTEND at 10:30 local');
  assert(!/DTSTART:.*Z/.test(ics), 'floating time has no Z suffix');
});

test('eventsToIcs emits DATE values with an exclusive end for all-day events', () => {
  const ics = eventsToIcs([ev({ id: 'a', allDay: true, start: 0, duration: 0, date: '2026-01-05' })], { dtstamp: STAMP });
  assert(ics.includes('DTSTART;VALUE=DATE:20260105'), 'all-day DTSTART is a DATE');
  assert(ics.includes('DTEND;VALUE=DATE:20260106'), 'all-day DTEND is the exclusive next day');
});

test('eventsToIcs escapes TEXT special characters', () => {
  const ics = eventsToIcs([ev({ id: 'a', title: 'Lunch, then gym; relax\\done', description: 'line1\nline2' })], { dtstamp: STAMP });
  assert(ics.includes('SUMMARY:Lunch\\, then gym\\; relax\\\\done'), 'commas/semicolons/backslashes escaped');
  assert(ics.includes('DESCRIPTION:line1\\nline2'), 'newlines escaped to \\n');
});

test('eventsToIcs folds long lines to <=75 octets', () => {
  const longTitle = 'A'.repeat(200);
  const ics = eventsToIcs([ev({ id: 'a', title: longTitle })], { dtstamp: STAMP });
  for (const line of ics.split('\r\n')) {
    assert(line.length <= 75, `line within 75 chars: "${line.slice(0, 20)}…" (${line.length})`);
  }
  // Continuation lines begin with a single space.
  assert(/\r\n [A]/.test(ics), 'folded continuation starts with a space');
});

test('round-trip: export then re-import preserves the schedule and Cadence metadata', () => {
  const events: PlanEvent[] = [
    ev({ id: 'work1', title: 'Deep work', date: '2026-01-05', start: 10 * 60, duration: 120, category: 'study', priority: 'high', done: false, location: 'Library', description: 'chapter 3' }),
    ev({ id: 'rest1', title: 'Nap', date: '2026-01-06', start: 14 * 60, duration: 30, category: 'rest', priority: 'low', done: true }),
    ev({ id: 'allday1', title: 'Holiday', date: '2026-01-07', allDay: true, start: 0, duration: 0, category: 'personal', priority: 'medium' }),
  ];
  const ics = eventsToIcs(events, { dtstamp: STAMP });
  const result = parseCalendarFile('roundtrip.ics', ics, []);
  eq(result.format, 'ics');
  eq(result.rows.length, 3);

  const byTitle = (t: string) => result.rows.find(r => r.draft.title === t)!.draft;

  const deep = byTitle('Deep work');
  eq(deep.date, '2026-01-05');
  eq(deep.start, 10 * 60);
  eq(deep.duration, 120);
  eq(deep.category, 'study');
  eq(deep.priority, 'high');
  eq(deep.location, 'Library');
  eq(deep.description, 'chapter 3');
  eq(deep.importUid, 'work1@cadence.local');

  const nap = byTitle('Nap');
  eq(nap.category, 'rest');
  eq(nap.priority, 'low');
  eq(nap.done, true);

  const holiday = byTitle('Holiday');
  eq(holiday.allDay, true);
  eq(holiday.date, '2026-01-07');
  eq(holiday.category, 'personal');
});

test('round-trip: re-importing the same export is detected as duplicates', () => {
  const events = [ev({ id: 'dup1', title: 'Standup', date: '2026-01-05', start: 9 * 60, duration: 30 })];
  const ics = eventsToIcs(events, { dtstamp: STAMP });
  // First import adds it; importing again against that result should flag a dup.
  const first = parseCalendarFile('e.ics', ics, []);
  const reimport = parseCalendarFile('e.ics', ics, [first.rows[0].draft]);
  eq(reimport.rows[0].duplicate, true);
  eq(reimport.rows[0].selected, false);
});

test('eventsToIcs handles a timed event that crosses midnight', () => {
  const ics = eventsToIcs([ev({ id: 'a', date: '2026-01-05', start: 23 * 60, duration: 120 })], { dtstamp: STAMP });
  assert(ics.includes('DTSTART:20260105T230000'), 'starts 11pm on the 5th');
  assert(ics.includes('DTEND:20260106T010000'), 'ends 1am on the 6th');
});

test('icsFilename is date-stamped', () => {
  eq(icsFilename(new Date(2026, 4, 31)), 'cadence-2026-05-31.ics');
});
