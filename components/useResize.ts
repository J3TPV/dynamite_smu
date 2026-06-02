import React, { useRef, useState } from 'react';
import { snap } from '../lib/layout';

/**
 * Drag-to-resize for a calendar event block. Dragging the bottom edge changes
 * the duration with 15-minute snapping, previewing live (local state, no store
 * churn) and committing once on pointer-up. Shared by Day and Week views, which
 * differ only in pixels-per-hour.
 *
 * `resizingRef` lets the host block's HTML5 `onDragStart` bail out, so a resize
 * gesture never doubles as a drag-to-move.
 */
export function useEventResize(opts: {
  duration: number;
  /** Event start (minutes from midnight) — caps the max duration at end-of-day. */
  start: number;
  /** Pixels per hour in the host view. */
  hourPx: number;
  onCommit: (duration: number) => void;
}) {
  const { duration, start, hourPx, onCommit } = opts;
  const [preview, setPreview] = useState<number | null>(null);
  const resizingRef = useRef(false);

  const beginResize = (ev: React.PointerEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    resizingRef.current = true;
    const startY = ev.clientY;
    const startDur = duration;
    const maxDur = 1440 - start;

    const move = (m: PointerEvent) => {
      const deltaMin = ((m.clientY - startY) / hourPx) * 60;
      setPreview(Math.max(15, Math.min(snap(startDur + deltaMin), maxDur)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setPreview(p => { if (p != null && p !== duration) onCommit(p); return null; });
      // Clear the drag guard after the current event loop so a trailing
      // synthetic dragstart/click from this gesture is still suppressed.
      setTimeout(() => { resizingRef.current = false; }, 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return {
    /** Duration to render (live preview while resizing, else the real value). */
    previewDuration: preview ?? duration,
    isResizing: preview !== null,
    resizingRef,
    beginResize,
  };
}
