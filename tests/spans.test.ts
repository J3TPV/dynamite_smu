// Tests for multi-day all-day events: the endDate model (sanitizer), the
// span-coverage helpers, and multi-day .ics export (exclusive DTEND).

import { test, eq, assert } from './_harness';
import { sanitizeEvent } from '../lib/storage';
import { eventCoversDate, isoInRange } from '../lib/datetime';
import { eventsToIcs } from '../lib/export/ics';
import { PlanEvent } from '../lib/types';

const STAMP = '20260101T000000Z';
const base = { id: 'x', title: 'Trip', start: 0, duration: 0, category: 'work', priority: 'medium', done: false, createdVia: 'manual' };

test('sanitizeEvent keeps endDate for a valid multi-day all-day event', () => {
  const e = sanitizeEvent({ ...base, date: '2026-03-10', endDate: '2026-03-13', allDay: true });
  eq(e?.endDate, '2026-03-13');
  eq(e?.allDay, true);
});

test('sanitizeEvent drops endDate on a non-all-day event', () => {
  const e = sanitizeEvent({ ...base, date: '2026-03-10', endDate: '2026-03-13', allDay: false, start: 540, duration: 60 });
  eq(e?.endDate, undefined);
});

test('sanitizeEvent drops endDate when it is not after the start date', () => {
  const same = sanitizeEvent({ ...base, date: '2026-03-10', endDate: '2026-03-10', allDay: true });
  eq(same?.endDate, undefined);
  const before = sanitizeEvent({ ...base, date: '2026-03-10', endDate: '2026-03-09', allDay: true });
  eq(before?.endDate, undefined);
});

test('eventCoversDate spans the inclusive range', () => {
  const e = { date: '2026-03-10', endDate: '2026-03-13' };
  assert(eventCoversDate(e, '2026-03-10'), 'covers start');
  assert(eventCoversDate(e, '2026-03-12'), 'covers middle');
  assert(eventCoversDate(e, '2026-03-13'), 'covers end (inclusive)');
  assert(!eventCoversDate(e, '2026-03-09'), 'excludes day before');
  assert(!eventCoversDate(e, '2026-03-14'), 'excludes day after');
});

test('eventCoversDate handles a single-day event with no endDate', () => {
  const e = { date: '2026-03-10' };
  assert(eventCoversDate(e, '2026-03-10'), 'covers its one day');
  assert(!eventCoversDate(e, '2026-03-11'), 'no spill');
});

test('isoInRange is inclusive on both ends', () => {
  assert(isoInRange('2026-03-10', '2026-03-10', '2026-03-12'));
  assert(isoInRange('2026-03-12', '2026-03-10', '2026-03-12'));
  assert(!isoInRange('2026-03-13', '2026-03-10', '2026-03-12'));
});

test('eventsToIcs emits an exclusive DTEND for a multi-day all-day span', () => {
  const e: PlanEvent = { ...base, date: '2026-01-05', endDate: '2026-01-07', allDay: true } as PlanEvent;
  const ics = eventsToIcs([e], { dtstamp: STAMP });
  assert(ics.includes('DTSTART;VALUE=DATE:20260105'), 'DTSTART is the first day');
  assert(ics.includes('DTEND;VALUE=DATE:20260108'), 'DTEND is the day after the last covered day (exclusive)');
});
