import { useEffect, useRef, useState } from 'react';

export interface DragPayload {
  /** id of the event being dragged */
  id: string;
  /** minutes from the event's TRUE start to the grab point (timed drags only) */
  grabMin?: number;
  /** true when the dragged event is all-day (date-only move, no time math) */
  allDay?: boolean;
}

type Active = { payload: DragPayload; x0: number; y0: number; pointerId: number; moved: boolean };

/**
 * Swallow the single click the browser synthesises right after a pointer drag,
 * so a drag-release doesn't also fire the drop target's onClick (edit / add).
 * Shared by the move and create-drag interactions.
 */
export function swallowNextClick() {
  const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
  window.addEventListener('click', swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', swallow, true), 350);
}

/**
 * Drag a calendar event with one mechanism for mouse, touch and pen.
 *
 * HTML5 drag-and-drop (`draggable` + `dragstart`/`drop`) never fires on touch
 * screens, so the calendar was un-draggable on phones/tablets. Pointer Events
 * cover all input types. A drag only "begins" once the pointer travels past a
 * small threshold, so a plain tap/click still reaches the element's `onClick`
 * (used for "edit event"). The synthetic click the browser emits right after a
 * drag-release is swallowed so it doesn't also open the editor or add an event.
 *
 * Drop targets are resolved by the caller via `document.elementFromPoint` in
 * the `onDrop` callback, which keeps the geometry maths next to each view.
 */
export function usePointerDrag(
  onDrop: (payload: DragPayload, clientX: number, clientY: number) => void,
  onMove?: (payload: DragPayload, clientX: number, clientY: number) => void,
  threshold = 6,
) {
  const cb = useRef({ onDrop, onMove, threshold });
  cb.current = { onDrop, onMove, threshold };
  const active = useRef<Active | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const a = active.current;
      if (!a || e.pointerId !== a.pointerId) return;
      if (!a.moved) {
        if (Math.abs(e.clientX - a.x0) < cb.current.threshold && Math.abs(e.clientY - a.y0) < cb.current.threshold) return;
        a.moved = true;
        setDraggingId(a.payload.id);
      }
      e.preventDefault(); // stop the page from scrolling/selecting mid-drag
      cb.current.onMove?.(a.payload, e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
      const a = active.current;
      if (!a || e.pointerId !== a.pointerId) return;
      active.current = null;
      setDraggingId(null);
      if (!a.moved) return; // a tap, not a drag — let the click through to onClick
      cb.current.onDrop(a.payload, e.clientX, e.clientY);
      swallowNextClick();
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  const startDrag = (payload: DragPayload, e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return; // primary button only for mouse
    active.current = { payload, x0: e.clientX, y0: e.clientY, pointerId: e.pointerId, moved: false };
  };

  return { startDrag, draggingId };
}
