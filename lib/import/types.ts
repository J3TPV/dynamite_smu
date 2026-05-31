// Shared types for the calendar importer (Outlook / Google / Apple migration).

import { PlanEvent } from '../types';

export type CalendarFormat = 'ics' | 'csv' | 'pst' | 'unknown';

/**
 * A normalized event extracted from any source format, before it's mapped onto
 * Cadence's PlanEvent model. Times are already resolved to the local day.
 */
export interface ImportedEvent {
  title: string;
  /** ISO date (local) YYYY-MM-DD */
  dateISO: string;
  /** Minutes from local midnight (0..1439), or null for an all-day event. */
  start: number | null;
  /** Duration in minutes. 0 means "unknown" — the mapper applies a default. */
  duration: number;
  allDay: boolean;
  location?: string;
  description?: string;
  /** Per-event notes: timezone assumptions, recurrence expansion, multi-day clamps. */
  warnings: string[];
  /** Source identity (ICS UID or a synthesized key) used to de-duplicate re-imports. */
  uid?: string;
}

/** A row in the import preview — a draft event the user can toggle/edit before adding. */
export interface ImportRow {
  draft: PlanEvent;
  selected: boolean;
  warnings: string[];
  /** Matches an event already on the calendar (same day, time and title). */
  duplicate: boolean;
}

export interface ImportResult {
  format: CalendarFormat;
  sourceName: string;
  rows: ImportRow[];
  /** File-level notes: unsupported-format guidance, counts, skips, caps hit. */
  diagnostics: string[];
  /** True when nothing importable was produced (unsupported format, empty, parse failure). */
  empty: boolean;
}

/** Hard limits to keep an accidental huge file from freezing the browser. */
export const IMPORT_LIMITS = {
  maxBytes: 8 * 1024 * 1024, // 8 MB
  maxEvents: 2000,
  // Recurrence is expanded forward from each event's own start, bounded by both:
  rruleWindowDays: 120,
  rruleMaxInstances: 60,
};
