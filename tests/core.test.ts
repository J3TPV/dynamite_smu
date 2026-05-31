// Deterministic unit tests over the pure core: datetime, layout, the Time-Health
// / feasibility engine (incl. the new smart-reschedule suggestion), the NLP
// parser, and import format detection.

import { test, eq, assert } from './_harness';
import {
  toISODate, fromISODate, addMonths, monthGridDays, startOfWeek,
  weekdayHeaders, durationToLabel, minutesToLabel, relativeDayLabel,
} from '../lib/datetime';
import { packColumns, clockHourLines } from '../lib/layout';
import { overlaps, findFreeSlot, computeDayHealth, evaluateFeasibility } from '../lib/analysis';
import { parseCommand, classifyText } from '../lib/parser';
import { detectFormat } from '../lib/import/index';
import { PlanEvent, ParsedCommand, Category, Priority } from '../lib/types';

// A fixed clock so date-relative parsing is deterministic: Mon 5 Jan 2026.
const NOW = new Date(2026, 0, 5);

function ev(date: string, start: number, duration: number, category: Category = 'work', extra: Partial<PlanEvent> = {}): PlanEvent {
  return { id: `${date}-${start}-${duration}`, title: 'e', date, start, duration, category, priority: 'medium', done: false, createdVia: 'manual', ...extra };
}
function candidate(date: string, start: number, duration: number, category: Category = 'work', priority: Priority = 'medium'): ParsedCommand {
  return { title: 'New task', date, start, duration, category, priority, confidence: 1, notes: [], assumedTime: false };
}

// ---- datetime ----
test('toISODate / fromISODate round-trip in local time', () => {
  eq(toISODate(new Date(2026, 4, 31)), '2026-05-31');
  eq(toISODate(fromISODate('2026-05-31')), '2026-05-31');
});
test('addMonths clamps to last valid day (May 31 + 1 = Jun 30)', () => {
  eq(toISODate(addMonths(new Date(2026, 4, 31), 1)), '2026-06-30');
});
test('addMonths handles year wrap and February', () => {
  eq(toISODate(addMonths(new Date(2026, 0, 31), 1)), '2026-02-28');
  eq(toISODate(addMonths(new Date(2026, 11, 15), 1)), '2027-01-15');
});
test('monthGridDays returns 42 aligned days', () => {
  const grid = monthGridDays(new Date(2026, 0, 15), 1);
  eq(grid.length, 42);
  eq(grid[0].getDay(), 1); // Monday start
});
test('startOfWeek respects weekStartsOn', () => {
  eq(toISODate(startOfWeek(new Date(2026, 0, 7), 1)), '2026-01-05'); // Wed -> Mon
  eq(toISODate(startOfWeek(new Date(2026, 0, 7), 0)), '2026-01-04'); // Wed -> Sun
});
test('weekdayHeaders ordered by week start', () => {
  eq(weekdayHeaders(1)[0], 'Mon');
  eq(weekdayHeaders(0)[0], 'Sun');
});
test('durationToLabel / minutesToLabel format', () => {
  eq(durationToLabel(45), '45 min');
  eq(durationToLabel(60), '1 hr');
  eq(durationToLabel(150), '2h 30m');
  eq(minutesToLabel(0), '12:00 AM');
  eq(minutesToLabel(13 * 60 + 5), '1:05 PM');
});
test('relativeDayLabel: today/tomorrow/yesterday', () => {
  eq(relativeDayLabel('2026-01-05', NOW), 'Today');
  eq(relativeDayLabel('2026-01-06', NOW), 'Tomorrow');
  eq(relativeDayLabel('2026-01-04', NOW), 'Yesterday');
});

// ---- layout ----
test('packColumns: overlapping events get distinct columns, same width', () => {
  const slots = packColumns([
    { id: 'a', start: 600, duration: 60 },
    { id: 'b', start: 630, duration: 60 },
  ]);
  eq(slots.a.cols, 2);
  eq(slots.b.cols, 2);
  assert(slots.a.col !== slots.b.col, 'overlapping events must not share a column');
});
test('packColumns: non-overlapping events are independent single columns', () => {
  const slots = packColumns([
    { id: 'a', start: 600, duration: 60 },
    { id: 'b', start: 700, duration: 60 },
  ]);
  eq(slots.a.cols, 1);
  eq(slots.b.cols, 1);
});
test('clockHourLines anchors to whole hours within the window', () => {
  eq(clockHourLines(6 * 60, 9 * 60), [360, 420, 480, 540]);
});

// ---- analysis ----
test('overlaps is true only for genuine intersection', () => {
  assert(overlaps({ start: 600, duration: 60 }, { start: 630, duration: 60 }));
  assert(!overlaps({ start: 600, duration: 60 }, { start: 660, duration: 60 }), 'touching edges do not overlap');
});
test('findFreeSlot returns earliest non-overlapping start', () => {
  const day = [ev('2026-01-05', 600, 60)];
  eq(findFreeSlot(day, 60), 360); // 6:00, before the 10:00 event
});
test('findFreeSlot returns null when the day cannot fit the duration', () => {
  // Pack the whole 6:00–22:00 window solid.
  const day = [ev('2026-01-05', 360, 16 * 60)];
  eq(findFreeSlot(day, 60), null);
});
test('computeDayHealth: an empty day scores higher than a clearly overloaded one', () => {
  const empty = computeDayHealth([], '2026-01-05').score;
  const overloaded = computeDayHealth([ev('2026-01-05', 360, 13 * 60)], '2026-01-05').score;
  assert(empty > overloaded, `empty (${empty}) should beat overloaded (${overloaded})`);
});
test('evaluateFeasibility: clean fit is feasible with no suggestion', () => {
  const f = evaluateFeasibility(candidate('2026-01-05', 9 * 60, 60), [], NOW);
  eq(f.verdict, 'feasible');
  eq(f.suggestedStart, undefined);
});
test('evaluateFeasibility: a clash yields a conflict-free suggestedStart', () => {
  const events = [ev('2026-01-05', 600, 60)];
  const f = evaluateFeasibility(candidate('2026-01-05', 600, 60), events, NOW);
  eq(f.verdict, 'conflict');
  assert(f.suggestedStart != null, 'a free slot should be suggested');
  // The suggested slot must not overlap the existing event.
  assert(!overlaps({ start: f.suggestedStart!, duration: 60 }, events[0]), 'suggestion overlaps the clashing event');
});
test('evaluateFeasibility: no suggestion when the day is genuinely full', () => {
  const events = [ev('2026-01-05', 360, 16 * 60)]; // fills the whole window
  const f = evaluateFeasibility(candidate('2026-01-05', 360, 60), events, NOW);
  eq(f.verdict, 'conflict');
  eq(f.suggestedStart, undefined);
});

// ---- parser ----
test('parseCommand extracts category, time, duration and a future date', () => {
  const p = parseCommand('gym tomorrow at 6pm for 45 minutes', NOW);
  eq(p.category, 'health');
  eq(p.start, 18 * 60);
  eq(p.duration, 45);
  eq(p.date, '2026-01-06');
});
test('parseCommand: high-priority keyword is detected', () => {
  const p = parseCommand('finish the report today, urgent', NOW);
  eq(p.priority, 'high');
  eq(p.category, 'work');
});
test('classifyText mirrors the parser categories for import', () => {
  eq(classifyText('Team standup meeting').category, 'work');
  eq(classifyText('Lunch with the team').category, 'social'); // "lunch with" beats "lunch"
  eq(classifyText('Quick lunch').category, 'meal');
});

// ---- import format detection ----
test('detectFormat: by extension', () => {
  eq(detectFormat('cal.ics', ''), 'ics');
  eq(detectFormat('export.csv', ''), 'csv');
  eq(detectFormat('archive.pst', ''), 'pst');
});
test('detectFormat: by content sniffing when extension is missing', () => {
  eq(detectFormat('noext', 'BEGIN:VCALENDAR\nBEGIN:VEVENT'), 'ics');
  eq(detectFormat('mystery', 'Subject,Start Date,Start Time\nFoo,2026-01-01,10:00'), 'csv');
  eq(detectFormat('mystery', 'random text with no signal'), 'unknown');
});
