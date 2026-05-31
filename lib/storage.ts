// localStorage-backed persistence + a small seed so the app feels alive on first run.

import { Category, CATEGORY_META, PlanEvent, Priority } from './types';
import { toISODate, addDays, stripTime } from './datetime';

const KEY = 'voiceplanner.events.v1';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidCategory = (c: unknown): c is Category => typeof c === 'string' && c in CATEGORY_META;
const isPriority = (p: unknown): p is Priority => p === 'low' || p === 'medium' || p === 'high';

/**
 * Coerce an arbitrary object into a safe PlanEvent, or drop it (null) if it has
 * no usable date. Protects every renderer from corrupt localStorage or a
 * hand-edited / foreign backup (e.g. an unknown category would crash a lookup).
 */
export function sanitizeEvent(raw: any): PlanEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const date = typeof raw.date === 'string' && ISO_RE.test(raw.date) ? raw.date : null;
  if (!date) return null;
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'Untitled event',
    date,
    start: Math.min(1439, Math.max(0, Math.round(num(raw.start, 0)))),
    duration: Math.max(0, Math.round(num(raw.duration, 0))),
    category: isValidCategory(raw.category) ? raw.category : 'work',
    priority: isPriority(raw.priority) ? raw.priority : 'medium',
    done: !!raw.done,
    createdVia: raw.createdVia === 'voice' || raw.createdVia === 'import' ? raw.createdVia : 'manual',
    allDay: raw.allDay ? true : undefined,
    location: typeof raw.location === 'string' ? raw.location : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    source: typeof raw.source === 'string' ? raw.source : undefined,
    importUid: typeof raw.importUid === 'string' ? raw.importUid : undefined,
  };
}

export function sanitizeEvents(arr: unknown): PlanEvent[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(sanitizeEvent).filter((e): e is PlanEvent => e !== null);
}

export function loadEvents(): PlanEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seed();
    return sanitizeEvents(parsed);
  } catch {
    return seed();
  }
}

/** Persist events. Returns false when the write failed (e.g. storage quota). */
export function saveEvents(events: PlanEvent[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
    return true;
  } catch {
    return false; // storage may be unavailable / full; app still works in-memory
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
