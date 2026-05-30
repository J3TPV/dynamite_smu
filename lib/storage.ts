// localStorage-backed persistence + a small seed so the app feels alive on first run.

import { PlanEvent } from './types';
import { toISODate, addDays, stripTime } from './datetime';

const KEY = 'voiceplanner.events.v1';

export function loadEvents(): PlanEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as PlanEvent[];
    if (!Array.isArray(parsed)) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

export function saveEvents(events: PlanEvent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    /* storage may be unavailable; app still works in-memory */
  }
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function seed(): PlanEvent[] {
  const today = stripTime(new Date());
  const t = toISODate(today);
  const tomorrow = toISODate(addDays(today, 1));
  const mk = (e: Omit<PlanEvent, 'id' | 'done' | 'createdVia'>): PlanEvent => ({
    ...e,
    id: newId(),
    done: false,
    createdVia: 'manual',
  });
  return [
    mk({ title: 'Team standup', date: t, start: 9 * 60, duration: 30, category: 'work', priority: 'medium' }),
    mk({ title: 'Deep work: project plan', date: t, start: 10 * 60, duration: 120, category: 'work', priority: 'high' }),
    mk({ title: 'Lunch', date: t, start: 12 * 60 + 30, duration: 45, category: 'meal', priority: 'low' }),
    mk({ title: 'Gym session', date: t, start: 18 * 60, duration: 60, category: 'health', priority: 'medium' }),
    mk({ title: 'Study: data structures', date: tomorrow, start: 10 * 60, duration: 90, category: 'study', priority: 'high' }),
    mk({ title: 'Coffee with Sam', date: tomorrow, start: 15 * 60, duration: 60, category: 'social', priority: 'low' }),
  ];
}
