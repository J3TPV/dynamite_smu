# Cadence — Product Roadmap

_Owner notes, written after taking over. Prioritized by value ÷ effort, anchored
to the product's one true differentiator: **knowing whether a plan fits your
life, and helping you fix it when it doesn't.**_

## Guiding principle

Everything else (views, themes, import) is table stakes. The moat is the
**Time-Health engine + feasibility analysis**. Each roadmap item should either
sharpen that moat or remove friction that stops people reaching it.

## Next up (highest value first)

1. **Actionable feasibility / smart reschedule** ← _building now_
   The engine already finds a conflict-free slot (`findFreeSlot`) but only prints
   it as prose — _"there's a free slot at 2 PM, want that instead?"_ — with no way
   to act. Close the loop: surface a one-click **"Move to {time}"** in the voice
   draft and the event editor so the analysis becomes a decision, not a report.

2. **Direct manipulation — drag-to-move & drag-to-resize** in Day/Week views.
   Clicking opens an editor; you can't grab a block and slide it. This is the
   single most expected calendar interaction and is currently absent. Live
   Time-Health recompute while dragging would make the moat tangible.

3. **Undo / safety net** for delete, clear-all, and import-replace.
   A whole-life planner that deletes on a single click with no undo is dangerous.
   A transient "Undo" toast (event-level + bulk) is cheap insurance.

4. **Recurring events (native)** — `PlanEvent.recurrence` + expansion.
   We can _import_ recurring events but not _create_ them. Biggest remaining
   scheduling-capability gap; pairs naturally with an ICS export round-trip.

5. **Now-line + reminders** — current-time indicator in Day/Week, and optional
   `Notification`-API nudges N minutes before an event.

6. **ICS export / round-trip** — we import from Google/Outlook/Apple; let users
   export back. Completes the migration story.

7. **Test & CI foundation** — lock the pure core (parser/analysis/import/datetime)
   under a real runner. _Started with item 1_ (dependency-light esbuild + node).

## Not now (deliberately deferred)

- Multi-device sync / accounts — contradicts the local-first, no-backend promise.
- AI/LLM parsing — the deterministic parser is offline, private, and fast; revisit
  only if accuracy plateaus.
- Time-zone-aware travel events — niche until there's demand.
