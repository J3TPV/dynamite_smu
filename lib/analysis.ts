// Schedule analysis: the Time-Health Index and per-task feasibility checks.
// All pure functions over the event list so they're easy to reason about/test.

import { CATEGORY_META, Feasibility, HealthFactor, ParsedCommand, PlanEvent, TimeHealth } from './types';
import { durationToLabel, minutesToLabel, relativeDayLabel } from './datetime';

export interface WorkingHours {
  dayStart: number; // minutes from midnight — start of a healthy waking day
  dayEnd: number;   // minutes from midnight — protected wind-down boundary
}

const DEFAULT_HOURS: WorkingHours = { dayStart: 6 * 60, dayEnd: 22 * 60 };
const HEALTHY_LOAD = 8 * 60; // 8h of demanding work is a full, balanced day
const HARD_LOAD = 11 * 60; // beyond this a day is overloaded

function eventsOnDate(events: PlanEvent[], iso: string): PlanEvent[] {
  // All-day events (imported banners like "Vacation" or "Holiday") carry no
  // specific time, so they don't contribute to load/overlap/breathing-room math.
  return events
    .filter(e => e.date === iso && !e.done && !e.allDay)
    .sort((a, b) => a.start - b.start);
}

export function overlaps(a: { start: number; duration: number }, b: { start: number; duration: number }): boolean {
  return a.start < b.start + b.duration && b.start < a.start + a.duration;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Compute the Time-Health Index for a single day given its events.
 * Returns a 0..100 score plus the factor breakdown driving it.
 */
export function computeDayHealth(events: PlanEvent[], iso: string, hours: WorkingHours = DEFAULT_HOURS): TimeHealth {
  const { dayStart, dayEnd } = hours;
  const wakingMinutes = Math.max(60, dayEnd - dayStart);
  const day = eventsOnDate(events, iso);

  const demanding = day.filter(e => CATEGORY_META[e.category]?.demanding);
  const loadMinutes = demanding.reduce((s, e) => s + e.duration, 0);
  const totalBooked = day.reduce((s, e) => s + e.duration, 0);

  // --- Factor 1: Load balance (is the demanding workload sustainable?) ---
  let loadScore: number;
  if (loadMinutes <= HEALTHY_LOAD) {
    // ramps up to 100 around a comfortably full day; empty days aren't "perfect"
    loadScore = 60 + (loadMinutes / HEALTHY_LOAD) * 40;
  } else {
    const over = loadMinutes - HEALTHY_LOAD;
    const span = HARD_LOAD - HEALTHY_LOAD;
    loadScore = clamp(100 - (over / span) * 100);
  }
  const loadFactor: HealthFactor = {
    key: 'load',
    label: 'Workload',
    score: clamp(loadScore),
    weight: 0.3,
    detail: `${durationToLabel(loadMinutes)} of demanding work (sweet spot ≈ ${durationToLabel(HEALTHY_LOAD)}).`,
  };

  // --- Factor 2: Conflicts / overlaps ---
  let conflictCount = 0;
  for (let i = 0; i < day.length; i++) {
    for (let j = i + 1; j < day.length; j++) {
      if (overlaps(day[i], day[j])) conflictCount++;
    }
  }
  const conflictFactor: HealthFactor = {
    key: 'conflict',
    label: 'No clashes',
    score: clamp(100 - conflictCount * 40),
    weight: 0.2,
    detail: conflictCount === 0 ? 'No overlapping events.' : `${conflictCount} overlapping pair${conflictCount > 1 ? 's' : ''} detected.`,
  };

  // --- Factor 3: Breathing room (buffers between events + not over-packed) ---
  let backToBack = 0;
  for (let i = 1; i < day.length; i++) {
    const gap = day[i].start - (day[i - 1].start + day[i - 1].duration);
    if (gap >= 0 && gap < 10) backToBack++;
  }
  const packed = totalBooked / wakingMinutes; // 0..>1
  let roomScore = 100 - backToBack * 15 - clamp(packed - 0.6, 0, 1) * 120;
  const roomFactor: HealthFactor = {
    key: 'room',
    label: 'Breathing room',
    score: clamp(roomScore),
    weight: 0.2,
    detail: backToBack > 0
      ? `${backToBack} back-to-back transition${backToBack > 1 ? 's' : ''} with no buffer.`
      : `${Math.round(packed * 100)}% of the waking day is booked.`,
  };

  // --- Factor 4: Balance / variety across life areas ---
  const cats = new Set(day.map(e => e.category));
  const hasRecovery = day.some(e => !CATEGORY_META[e.category]?.demanding);
  let balanceScore = 50 + cats.size * 12 + (hasRecovery ? 14 : 0);
  if (day.length === 0) balanceScore = 70;
  if (demanding.length > 0 && !hasRecovery) balanceScore -= 25;
  const balanceFactor: HealthFactor = {
    key: 'balance',
    label: 'Life balance',
    score: clamp(balanceScore),
    weight: 0.15,
    detail: hasRecovery
      ? `Spans ${cats.size} area${cats.size > 1 ? 's' : ''}, with recovery time.`
      : 'All demanding — no health, rest, or personal time.',
  };

  // --- Factor 5: Boundary protection (early / late scheduling) ---
  const earlyLate = day.filter(e => e.start < dayStart || e.start + e.duration > dayEnd);
  const boundaryFactor: HealthFactor = {
    key: 'boundary',
    label: 'Healthy hours',
    score: clamp(100 - earlyLate.length * 30),
    weight: 0.15,
    detail: earlyLate.length === 0
      ? 'Everything sits within healthy waking hours.'
      : `${earlyLate.length} event${earlyLate.length > 1 ? 's' : ''} spill outside ${minutesToLabel(dayStart)}–${minutesToLabel(dayEnd)}.`,
  };

  const factors = [loadFactor, conflictFactor, roomFactor, balanceFactor, boundaryFactor];
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);

  const label: TimeHealth['label'] =
    score >= 80 ? 'Thriving' : score >= 60 ? 'Balanced' : score >= 40 ? 'Strained' : 'Overloaded';

  const recommendations = buildRecommendations(factors, { loadMinutes, conflictCount, backToBack, hasRecovery, demandingCount: demanding.length, earlyLate: earlyLate.length });

  return { score, label, factors, recommendations, loadMinutes };
}

function buildRecommendations(
  factors: HealthFactor[],
  ctx: { loadMinutes: number; conflictCount: number; backToBack: number; hasRecovery: boolean; demandingCount: number; earlyLate: number },
): string[] {
  const recs: string[] = [];
  if (ctx.conflictCount > 0) recs.push('Resolve overlapping events — move one to a free slot.');
  if (ctx.loadMinutes > HARD_LOAD) recs.push(`That's ${durationToLabel(ctx.loadMinutes)} of focused work. Push a lower-priority task to another day.`);
  else if (ctx.loadMinutes > HEALTHY_LOAD) recs.push('You\'re over a full workday. Protect a real break to stay sharp.');
  if (ctx.backToBack >= 2) recs.push('Add 10–15 min buffers between meetings to reset.');
  if (ctx.demandingCount > 0 && !ctx.hasRecovery) recs.push('Block some recovery time — a walk, a meal away from the desk, or rest.');
  if (ctx.earlyLate > 0) recs.push('Pull late/early events into daytime hours to protect sleep.');
  if (recs.length === 0) recs.push('This day looks well-balanced. Keep the buffers and recovery time.');
  return recs;
}

/** Average daily health across a set of ISO dates (e.g. the visible week). */
export function computeRangeHealth(events: PlanEvent[], isoDates: string[], hours: WorkingHours = DEFAULT_HOURS): TimeHealth {
  const days = isoDates.map(d => computeDayHealth(events, d, hours));
  const score = Math.round(days.reduce((s, d) => s + d.score, 0) / days.length);
  const loadMinutes = days.reduce((s, d) => s + d.loadMinutes, 0);
  const label: TimeHealth['label'] =
    score >= 80 ? 'Thriving' : score >= 60 ? 'Balanced' : score >= 40 ? 'Strained' : 'Overloaded';

  // Aggregate factors by averaging each key across days
  const keys = days[0]?.factors.map(f => f.key) ?? [];
  const factors: HealthFactor[] = keys.map(key => {
    const sample = days[0].factors.find(f => f.key === key)!;
    const avg = Math.round(days.reduce((s, d) => s + (d.factors.find(f => f.key === key)?.score ?? 0), 0) / days.length);
    return { ...sample, score: avg, detail: `Weekly average across ${days.length} days.` };
  });

  // Surface the most common recommendations
  const recCount = new Map<string, number>();
  days.forEach(d => d.recommendations.forEach(r => recCount.set(r, (recCount.get(r) ?? 0) + 1)));
  const recommendations = [...recCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

  return { score, label, factors, recommendations, loadMinutes };
}

/**
 * Evaluate whether a candidate (parsed) task fits into the existing schedule,
 * and how it would change the day's Time-Health Index.
 */
export function evaluateFeasibility(candidate: ParsedCommand, events: PlanEvent[], now: Date, hours: WorkingHours = DEFAULT_HOURS): Feasibility {
  const day = eventsOnDate(events, candidate.date);
  const cand = { start: candidate.start, duration: candidate.duration };

  const conflicts = day.filter(e => overlaps(cand, e));

  const healthBefore = computeDayHealth(events, candidate.date, hours).score;
  const ghost: PlanEvent = {
    id: '__candidate__',
    title: candidate.title,
    date: candidate.date,
    start: candidate.start,
    duration: candidate.duration,
    category: candidate.category,
    priority: candidate.priority,
    done: false,
    createdVia: 'voice',
  };
  const after = computeDayHealth([...events, ghost], candidate.date, hours);
  const healthAfter = after.score;

  const reasons: string[] = [];
  const suggestions: string[] = [];

  const demandingLoad = after.loadMinutes;
  const dayLabel = relativeDayLabel(candidate.date, now);

  let verdict: Feasibility['verdict'];
  if (conflicts.length > 0) {
    verdict = 'conflict';
    reasons.push(`Overlaps with ${conflicts.map(c => `“${c.title}” (${minutesToLabel(c.start)})`).join(', ')}.`);
    const free = findFreeSlot(day, candidate.duration, hours);
    if (free !== null) suggestions.push(`There's a free ${durationToLabel(candidate.duration)} slot at ${minutesToLabel(free)} — want that instead?`);
    else suggestions.push('No open slot of that length today — consider a lighter day.');
  } else if (healthAfter < 40) {
    verdict = 'overloaded';
    reasons.push(`Adding this drops ${dayLabel}'s Time-Health to ${healthAfter}/100 (Overloaded).`);
    if (CATEGORY_META[candidate.category]?.demanding) reasons.push(`Demanding load would reach ${durationToLabel(demandingLoad)}.`);
    suggestions.push('Move it to a lighter day, or trade it for a lower-priority task already on the calendar.');
  } else if (healthAfter < 60 || healthBefore - healthAfter >= 12) {
    verdict = 'tight';
    reasons.push(`It fits, but ${dayLabel}'s Time-Health would be ${healthAfter}/100${healthBefore > healthAfter ? ` (down ${healthBefore - healthAfter})` : ''}.`);
    if (CATEGORY_META[candidate.category]?.demanding && demandingLoad > HEALTHY_LOAD) suggestions.push('Consider a shorter session or a buffer before/after.');
  } else {
    verdict = 'feasible';
    reasons.push(`Fits cleanly. ${dayLabel}'s Time-Health stays healthy at ${healthAfter}/100.`);
  }

  const headlineMap: Record<Feasibility['verdict'], string> = {
    feasible: 'Looks good ✅',
    tight: 'Doable, but tight ⚠️',
    conflict: 'Scheduling clash ⛔',
    overloaded: 'Would overload your day 🔴',
  };

  return {
    verdict,
    headline: headlineMap[verdict],
    conflicts,
    reasons,
    suggestions,
    healthBefore,
    healthAfter,
  };
}

/** Find the earliest start (within the waking-hours window) that fits `duration` without overlap. */
export function findFreeSlot(day: PlanEvent[], duration: number, hours: WorkingHours = DEFAULT_HOURS): number | null {
  const sorted = [...day].filter(e => !e.allDay).sort((a, b) => a.start - b.start);
  let cursor = hours.dayStart;
  for (const e of sorted) {
    if (e.start - cursor >= duration) return cursor;
    cursor = Math.max(cursor, e.start + e.duration);
  }
  if (hours.dayEnd - cursor >= duration) return cursor;
  return null;
}
