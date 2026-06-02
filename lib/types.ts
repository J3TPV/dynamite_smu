// Core domain types for the voice calendar planner.

export type Category =
  | 'work'
  | 'study'
  | 'health'
  | 'personal'
  | 'social'
  | 'meal'
  | 'rest';

export type Priority = 'low' | 'medium' | 'high';

export interface PlanEvent {
  id: string;
  title: string;
  /** ISO date, local: YYYY-MM-DD */
  date: string;
  /** Start time as minutes from local midnight (0..1439). 0 for all-day events. */
  start: number;
  /** Duration in minutes. 0 for all-day events. */
  duration: number;
  category: Category;
  priority: Priority;
  done: boolean;
  createdVia: 'voice' | 'manual' | 'import';
  /** Raw transcript this event was parsed from, if any */
  source?: string;
  /** All-day event (no specific time) — shown as a banner, excluded from time-load scoring. */
  allDay?: boolean;
  /**
   * Inclusive last day for a multi-day all-day event (YYYY-MM-DD). Present only
   * when the event spans more than one day (endDate > date); single-day events
   * omit it. Only meaningful together with `allDay`.
   */
  endDate?: string;
  /** Optional location carried over from an imported calendar. */
  location?: string;
  /** Optional free-text notes/description carried over from an imported calendar. */
  description?: string;
  /** Stable source identity (e.g. ICS UID) used to de-duplicate re-imports. */
  importUid?: string;
}

/** Result of parsing a natural-language command into a candidate event. */
export interface ParsedCommand {
  title: string;
  date: string;
  start: number;
  duration: number;
  category: Category;
  priority: Priority;
  /** 0..1 confidence that the parse is meaningful */
  confidence: number;
  /** Human-readable notes about how the command was interpreted */
  notes: string[];
  /** True when the user didn't specify a time and we picked one */
  assumedTime: boolean;
}

export interface CategoryMeta {
  label: string;
  /** hex used for calendar blocks */
  color: string;
  /** daisyUI badge class */
  badge: string;
  emoji: string;
  /** Whether this counts as "load" (demanding) vs recovery */
  demanding: boolean;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  work: { label: 'Work', color: '#4a7c9b', badge: 'badge-info', emoji: '💼', demanding: true },
  study: { label: 'Study', color: '#7c5cbf', badge: 'badge-secondary', emoji: '📚', demanding: true },
  health: { label: 'Health', color: '#3d8b6e', badge: 'badge-success', emoji: '🏃', demanding: false },
  personal: { label: 'Personal', color: '#ff7f50', badge: 'badge-accent', emoji: '🧩', demanding: false },
  social: { label: 'Social', color: '#d4709a', badge: 'badge-secondary', emoji: '🥂', demanding: false },
  meal: { label: 'Meal', color: '#b8860b', badge: 'badge-warning', emoji: '🍽️', demanding: false },
  rest: { label: 'Rest', color: '#6b7280', badge: 'badge-neutral', emoji: '🌙', demanding: false },
};

export interface TimeHealth {
  /** 0..100 */
  score: number;
  label: 'Thriving' | 'Balanced' | 'Strained' | 'Overloaded';
  /** Individual scored factors, each 0..100, with weight */
  factors: HealthFactor[];
  recommendations: string[];
  /** Demanding minutes scheduled in the window */
  loadMinutes: number;
}

export interface HealthFactor {
  key: string;
  label: string;
  score: number; // 0..100
  weight: number; // relative
  detail: string;
}

export interface Feasibility {
  verdict: 'feasible' | 'tight' | 'conflict' | 'overloaded';
  headline: string;
  conflicts: PlanEvent[];
  reasons: string[];
  suggestions: string[];
  /** Time-health of the day before and after adding the candidate */
  healthBefore: number;
  healthAfter: number;
  /**
   * A conflict-free start time (minutes from midnight) the candidate could move
   * to on the same day, when its current slot clashes. Lets the UI offer a
   * one-click "Move to {time}" instead of just describing the free slot.
   */
  suggestedStart?: number;
}
