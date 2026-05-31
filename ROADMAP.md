# Cadence — Product Roadmap

_Owner notes, written after taking over. Prioritized by value ÷ effort, anchored
to the product's one true differentiator: **knowing whether a plan fits your
life, and helping you fix it when it doesn't.**_

## Guiding principle

Everything else (views, themes, import) is table stakes. The moat is the
**Time-Health engine + feasibility analysis**. Each roadmap item should either
sharpen that moat or remove friction that stops people reaching it.

## Shipped

- ✅ **Actionable feasibility / smart reschedule** — one-click "Move to {time}"
  from `Feasibility.suggestedStart` in the voice draft + event editor.
- ✅ **Drag-to-move** in Day/Week views (HTML5 DnD, 15-min snap).
- ✅ **ICS export / round-trip** — `lib/export/ics.ts` serializes events to a
  dependency-free, RFC-5545 VCALENDAR (line-folded, CRLF, escaped TEXT) that opens
  in Google/Outlook/Apple **and** re-imports cleanly into Cadence. Faithful
  round-trip via `X-CADENCE-CATEGORY/PRIORITY/DONE` hints the importer honours.
  "Export .ics" in Settings → Your data. Covered by `tests/export.test.ts`.
- ✅ **Test foundation** — dependency-light runner (`scripts/test.mjs`, esbuild +
  node), growing with each feature. `npm test`.

## Next up (highest value first)

1. **Undo / safety net** for delete, clear-all, and import-replace.
   A whole-life planner that deletes on a single click with no undo is dangerous.
   A transient "Undo" toast (event-level + bulk) is cheap insurance.

2. **Drag-to-resize** in Day/Week (drag-to-move already shipped). Grab an event's
   bottom edge to change its duration, with 15-min snapping and live conflict
   feedback. Completes the direct-manipulation story.

3. **Recurring events (native)** — `PlanEvent.recurrence` + expansion.
   We can _import_ recurring events but not _create_ them. Biggest remaining
   scheduling-capability gap; the ICS exporter should emit RRULE for these.

4. **Now-line + reminders** — current-time indicator in Day/Week, and optional
   `Notification`-API nudges N minutes before an event.

## Not now (deliberately deferred)

- Multi-device sync / accounts — contradicts the local-first, no-backend promise.
- AI/LLM parsing — the deterministic parser is offline, private, and fast; revisit
  only if accuracy plateaus.
- Time-zone-aware travel events — niche until there's demand.
