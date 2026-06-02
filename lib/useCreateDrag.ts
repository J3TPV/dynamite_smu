import { useEffect, useRef, useState } from 'react';
import { swallowNextClick } from './usePointerDrag';

/**
 * Click-and-drag to CREATE events, in two flavours:
 *
 *  - useTimeRangeDrag  — a vertical sweep on a Day/Week time column, defining a
 *    new timed event's start→end (its duration).
 *  - useDateRangeDrag  — a horizontal/vertical sweep across day cells (Month grid
 *    or Week all-day row), defining a multi-day all-day event's date span.
 *
 * Both share the move/create distinction with usePointerDrag: a plain tap/click
 * (no movement / never leaving the start cell) falls through to the element's
 * onClick so single-slot click-to-add still works; only a real drag creates a
 * range, and the trailing synthetic click is swallowed.
 */

export interface TimeRangeActive { rectTop: number; downY: number; curY: number; iso: string; }

export function useTimeRangeDrag(onCreate: (iso: string, downY: number, upY: number, rectTop: number) => void, threshold = 6) {
  const cb = useRef({ onCreate, threshold });
  cb.current = { onCreate, threshold };
  const [active, setActive] = useState<TimeRangeActive | null>(null);
  const ref = useRef<{ pointerId: number; rectTop: number; downY: number; iso: string; moved: boolean } | null>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const a = ref.current; if (!a || e.pointerId !== a.pointerId) return;
      if (!a.moved) { if (Math.abs(e.clientY - a.downY) < cb.current.threshold) return; a.moved = true; }
      e.preventDefault();
      setActive({ rectTop: a.rectTop, downY: a.downY, curY: e.clientY, iso: a.iso });
    };
    const up = (e: PointerEvent) => {
      const a = ref.current; if (!a || e.pointerId !== a.pointerId) return;
      ref.current = null; setActive(null);
      if (!a.moved) return;
      cb.current.onCreate(a.iso, a.downY, e.clientY, a.rectTop);
      swallowNextClick();
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, []);

  const begin = (e: React.PointerEvent, iso: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    ref.current = { pointerId: e.pointerId, rectTop: rect.top, downY: e.clientY, iso, moved: false };
  };

  return { begin, active };
}

export interface DateRangeActive { fromISO: string; toISO: string; }

export function useDateRangeDrag(onCreate: (fromISO: string, toISO: string) => void) {
  const cb = useRef(onCreate);
  cb.current = onCreate;
  const [active, setActive] = useState<DateRangeActive | null>(null);
  const ref = useRef<{ pointerId: number; startISO: string; moved: boolean } | null>(null);

  useEffect(() => {
    const readISO = (x: number, y: number) =>
      ((document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-date]') as HTMLElement | null)?.getAttribute('data-date') ?? null;
    const order = (a: string, b: string): DateRangeActive => (b < a ? { fromISO: b, toISO: a } : { fromISO: a, toISO: b });
    const move = (e: PointerEvent) => {
      const a = ref.current; if (!a || e.pointerId !== a.pointerId) return;
      const cur = readISO(e.clientX, e.clientY); if (!cur) return;
      if (cur !== a.startISO) a.moved = true;
      if (a.moved) { e.preventDefault(); setActive(order(a.startISO, cur)); }
    };
    const up = (e: PointerEvent) => {
      const a = ref.current; if (!a || e.pointerId !== a.pointerId) return;
      ref.current = null;
      const moved = a.moved;
      const cur = readISO(e.clientX, e.clientY) ?? a.startISO;
      setActive(null);
      if (!moved) return;
      const r = order(a.startISO, cur);
      cb.current(r.fromISO, r.toISO);
      swallowNextClick();
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, []);

  const begin = (e: React.PointerEvent, startISO: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ref.current = { pointerId: e.pointerId, startISO, moved: false };
  };

  return { begin, active };
}
