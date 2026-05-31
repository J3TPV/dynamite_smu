// Lay out overlapping timed events into side-by-side columns. Computed once per
// day over the whole event set so every event in a connected overlap cluster
// agrees on the column count (avoids the per-event mis-positioning where two
// events that don't overlap each other still disagree on total width).

export interface TimeSpan { id: string; start: number; duration: number; }
export interface Slot { col: number; cols: number; }

/** Map each event id → its column index and the cluster's total column count. */
export function packColumns(events: TimeSpan[]): Record<string, Slot> {
  const sorted = [...events].sort((a, b) => a.start - b.start || (a.start + a.duration) - (b.start + b.duration));
  const res: Record<string, Slot> = {};

  let cluster: { id: string; col: number }[] = [];
  let colEnds: number[] = []; // end-time currently occupying each column
  let clusterMaxEnd = -Infinity;

  const flush = () => {
    const cols = colEnds.length;
    cluster.forEach(c => { res[c.id] = { col: c.col, cols }; });
    cluster = [];
    colEnds = [];
    clusterMaxEnd = -Infinity;
  };

  for (const e of sorted) {
    const end = e.start + e.duration;
    // A new event that starts at/after everything seen so far begins a fresh cluster.
    if (cluster.length && e.start >= clusterMaxEnd) flush();
    let col = colEnds.findIndex(ce => ce <= e.start);
    if (col === -1) { col = colEnds.length; colEnds.push(end); } else { colEnds[col] = end; }
    cluster.push({ id: e.id, col });
    clusterMaxEnd = Math.max(clusterMaxEnd, end);
  }
  flush();
  return res;
}

/** Snap a minute value to the nearest `step`-minute increment (default 15). */
export function snap(minutes: number, step = 15): number {
  return Math.round(minutes / step) * step;
}

/** Hour-boundary gridlines within a window, anchored to real clock hours. */
export function clockHourLines(dayStart: number, dayEnd: number): number[] {
  const first = Math.ceil(dayStart / 60) * 60;
  const lines: number[] = [];
  for (let h = first; h <= dayEnd; h += 60) lines.push(h);
  return lines;
}
