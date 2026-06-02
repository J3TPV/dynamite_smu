# Cadence — Voice Calendar Planner

Plan your week just by talking. Speak a command like *"schedule a team meeting
tomorrow at 2pm for an hour"* and Cadence turns it into a calendar event, then
tells you whether it actually fits your life.

## Features

- **🎙️ Voice → calendar** — uses the browser's Web Speech API to capture a
  command and a built-in natural-language parser to extract the **title, date,
  time, duration, category, and priority**. No backend or API keys; everything
  runs locally. (Type-mode fallback for browsers without speech support.)
- **🗓️ Week calendar** — a Monday–Sunday grid with color-coded, category-aware
  event blocks, overlap-aware side-by-side layout, and conflict highlighting.
- **🧠 Feasibility analysis** — before an event is added, Cadence checks for
  clashes with existing events, finds a free slot if there's a conflict, and
  shows how the event would change your day's health.
- **❤️ Time-Health Index (0–100)** — a composite score over a day or the week
  built from five factors: **workload** sustainability, **clash-free** schedule,
  **breathing room** (buffers / over-packing), **life balance** (variety +
  recovery time), and **healthy hours** (protecting early/late boundaries). It
  comes with plain-language recommendations.
- **📥 Import from other calendars** — migrate from **Google Calendar, Outlook,
  or Apple Calendar** by dropping in an exported **`.ics`** (iCalendar) or
  **`.csv`** file. Cadence auto-detects the format, parses all-day vs timed
  events, converts UTC times to your local zone, expands recurring events, and
  infers a category for each one. You get a preview where you can deselect
  events, fix categories, and skip duplicates before importing. (`.pst`/`.ost`
  Outlook archives can't be read in the browser — Cadence detects them and shows
  you how to export an `.ics`/`.csv` instead.)

Everything is parsed locally in the browser — no upload, no backend, no API keys.
Events persist in `localStorage`, so your plan is there when you come back.

## Run it

```
node serve.js          # static server on http://localhost:3000
```

Or with the dev toolchain:

```
npm install
npm run dev            # vite dev server
npm run build          # production build into dist/
```

## How it's built

- React 19 + TypeScript, bundled with Vite.
- Tailwind + daisyUI for styling (auto light/dark theme).
- `lib/parser.ts` — deterministic natural-language command parser.
- `lib/analysis.ts` — Time-Health Index + feasibility engine (pure functions).
- `lib/useSpeech.ts` — thin React hook over the Web Speech API.
- `lib/import/` — dependency-free calendar importers: `ics.ts` (iCalendar),
  `csv.ts` (Google/Outlook CSV), and `index.ts` (format detection + mapping onto
  the `PlanEvent` model + duplicate detection).
