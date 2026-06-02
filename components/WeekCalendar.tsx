import React, { useState } from 'react';
import { Trash2, Check } from 'lucide-react';
import { CategoryMeta, PlanEvent } from '../lib/types';
import { addDays, durationToLabel, eventCoversDate, fromISODate, isoInRange, minutesToLabel, toISODate, weekdayShort } from '../lib/datetime';
import { overlaps } from '../lib/analysis';
import { packColumns, clockHourLines, snap, Slot } from '../lib/layout';
import { useCategoryMeta } from './SettingsContext';
import { useEventResize } from './useResize';
import { usePointerDrag, DragPayload } from '../lib/usePointerDrag';
import { useTimeRangeDrag, useDateRangeDrag } from '../lib/useCreateDrag';

const HOUR_PX = 46;

type EventPatch = Partial<Pick<PlanEvent, 'date' | 'start' | 'duration' | 'endDate'>>;

interface Props {
  events: PlanEvent[];
  weekStart: Date;
  selectedDate: string;
  today: string;
  dayStart: number;
  dayEnd: number;
  onSelectDate: (iso: string) => void;
  onShiftWeek: (delta: number) => void;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
  onEventClick: (e: PlanEvent) => void;
  onMoveEvent: (id: string, patch: EventPatch) => void;
  onAddAt: (dateISO: string, startMin: number) => void;
  onCreateAt: (dateISO: string, startMin: number, duration: number) => void;
  onAddAllDay: (dateISO: string) => void;
  onCreateAllDayRange: (fromISO: string, toISO: string) => void;
}

export const WeekCalendar: React.FC<Props> = ({
  events, weekStart, selectedDate, today, dayStart, dayEnd, onSelectDate, onToggleDone, onDelete, onEventClick, onMoveEvent, onAddAt, onCreateAt, onAddAllDay, onCreateAllDayRange,
}) => {
  const categoryMeta = useCategoryMeta();
  const viewStart = dayStart;
  const viewEnd = dayEnd;
  const totalPx = ((viewEnd - viewStart) / 60) * HOUR_PX;

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const lines = clockHourLines(viewStart, viewEnd);
  const allDayByDay = days.map(d => { const iso = toISODate(d); return events.filter(e => e.allDay && eventCoversDate(e, iso)); });

  const [preview, setPreview] = useState<{ x: number; y: number; label: string } | null>(null);

  const yToMin = (clientY: number, rectTop: number) => snap(viewStart + ((clientY - rectTop) / HOUR_PX) * 60);

  // --- Drag-to-MOVE (pointer events, mouse+touch) ---
  const findStart = (payload: DragPayload, x: number, y: number): { iso: string; start: number } | null => {
    const col = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-timed]') as HTMLElement | null;
    if (!col) return null;
    const iso = col.getAttribute('data-date')!;
    const r = col.getBoundingClientRect();
    const dur = events.find(e => e.id === payload.id)?.duration ?? 0;
    const pointerMin = viewStart + ((y - r.top) / HOUR_PX) * 60;
    const maxStart = Math.max(viewStart, viewEnd - dur);
    const start = Math.min(Math.max(snap(pointerMin - (payload.grabMin || 0)), viewStart), maxStart);
    return { iso, start };
  };
  const findDay = (x: number, y: number): string | null =>
    ((document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-date]') as HTMLElement | null)?.getAttribute('data-date') ?? null;
  const dayLabel = (iso: string) => { const d = fromISODate(iso); return `${weekdayShort(d)} ${d.getDate()}`; };
  // Moving a multi-day all-day event shifts its whole span (keeps the duration).
  const moveDayPatch = (id: string, targetISO: string): EventPatch => {
    const ev = events.find(e => e.id === id);
    if (ev?.allDay && ev.endDate && ev.endDate > ev.date) {
      const delta = Math.round((fromISODate(targetISO).getTime() - fromISODate(ev.date).getTime()) / 86400000);
      return { date: targetISO, endDate: toISODate(addDays(fromISODate(ev.endDate), delta)) };
    }
    return { date: targetISO };
  };

  const { startDrag, draggingId } = usePointerDrag(
    (payload, x, y) => {
      setPreview(null);
      if (payload.allDay) { const iso = findDay(x, y); if (iso) onMoveEvent(payload.id, moveDayPatch(payload.id, iso)); }
      else { const hit = findStart(payload, x, y); if (hit) onMoveEvent(payload.id, { date: hit.iso, start: hit.start }); }
    },
    (payload, x, y) => {
      if (payload.allDay) { const iso = findDay(x, y); setPreview(iso ? { x, y, label: dayLabel(iso) } : null); }
      else { const hit = findStart(payload, x, y); setPreview(hit ? { x, y, label: minutesToLabel(hit.start) } : null); }
    },
  );

  // --- Drag-to-CREATE: vertical time sweep (timed) + horizontal date span (all-day) ---
  const timeCreate = useTimeRangeDrag((iso, downY, upY, rectTop) => {
    const lo = Math.min(yToMin(downY, rectTop), yToMin(upY, rectTop));
    const hi = Math.max(yToMin(downY, rectTop), yToMin(upY, rectTop));
    const start = Math.max(viewStart, Math.min(lo, viewEnd - 15));
    const end = Math.min(viewEnd, Math.max(hi, start + 15));
    onCreateAt(iso, start, end - start);
  });
  const dateCreate = useDateRangeDrag((from, to) => onCreateAllDayRange(from, to));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Day header row */}
        <div className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
          <div />
          {days.map(d => {
            const iso = toISODate(d);
            const isToday = iso === today;
            const isSel = iso === selectedDate;
            return (
              <button
                key={iso}
                onClick={() => onSelectDate(iso)}
                className={`flex flex-col items-center py-1.5 rounded-t-lg transition-colors ${isSel ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}`}
              >
                <span className="text-[0.65rem] uppercase opacity-70">{weekdayShort(d)}</span>
                <span className={`text-sm font-bold ${isToday && !isSel ? 'text-primary' : ''}`}>{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* All-day banner row (always shown) — click to add, drag across days for a multi-day event */}
        {(
          <div className="grid border-b border-base-300" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
            <div className="text-[0.55rem] text-base-content/40 text-right pr-1 pt-1 leading-tight">all-day</div>
            {days.map((d, i) => {
              const iso = toISODate(d);
              const inRange = dateCreate.active && isoInRange(iso, dateCreate.active.fromISO, dateCreate.active.toISO);
              return (
                <div
                  key={iso}
                  data-date={iso}
                  onPointerDown={e => dateCreate.begin(e, iso)}
                  className={`border-l border-base-300 p-0.5 space-y-0.5 min-h-[1.5rem] cursor-pointer touch-none ${inRange ? 'bg-primary/20' : iso === selectedDate ? 'bg-primary/5' : ''}`}
                  title="Click to add an all-day event · drag across days for a multi-day event"
                  onClick={() => onAddAllDay(iso)}
                >
                  {allDayByDay[i].map(e => {
                    const meta = categoryMeta[e.category];
                    const spanStart = e.date === iso;
                    const spanEnd = (e.endDate ?? e.date) === iso;
                    const showTitle = spanStart || i === 0;
                    const rounded = `${spanStart ? 'rounded-l' : ''} ${spanEnd ? 'rounded-r' : ''}`.trim() || 'rounded-none';
                    return (
                      <div
                        key={e.id}
                        onPointerDown={ev => { ev.stopPropagation(); startDrag({ id: e.id, allDay: true }, ev); }}
                        className={`group flex items-center gap-1 px-1 py-0.5 text-white text-[0.6rem] leading-tight cursor-grab active:cursor-grabbing touch-none select-none ${rounded} ${e.done ? 'opacity-50 line-through' : ''} ${draggingId === e.id ? 'opacity-60 ring-2 ring-primary' : ''}`}
                        style={{ backgroundColor: meta.color }}
                        title={`${e.title} · ${spanStart && spanEnd ? 'all day' : 'multi-day'}`}
                        onClick={ev => { ev.stopPropagation(); onEventClick(e); }}
                      >
                        <span className="truncate flex-1">{!spanStart && '‹ '}{showTitle ? `${meta.emoji} ${e.title}` : ' '}{!spanEnd && ' ›'}</span>
                        {spanStart && <button className="rounded bg-black/30 hover:bg-error p-0.5 hidden group-hover:block shrink-0" onClick={ev => { ev.stopPropagation(); onDelete(e.id); }} aria-label="Delete event"><Trash2 size={9} /></button>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Time grid */}
        <div className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
          <div className="relative" style={{ height: totalPx }}>
            {lines.map(h => (
              <div key={h} className="absolute right-1 -translate-y-1/2 text-[0.6rem] text-base-content/40" style={{ top: ((h - viewStart) / 60) * HOUR_PX }}>
                {minutesToLabel(h).replace(':00', '')}
              </div>
            ))}
          </div>

          {days.map(d => {
            const iso = toISODate(d);
            const dayEvents = events.filter(e => e.date === iso && !e.allDay).sort((a, b) => a.start - b.start);
            const layout = packColumns(dayEvents);
            const startFromY = (clientY: number, rectTop: number) => Math.max(0, Math.min(yToMin(clientY, rectTop), 1440 - 15));
            const ga = timeCreate.active && timeCreate.active.iso === iso ? timeCreate.active : null;
            return (
              <div
                key={iso}
                data-date={iso}
                data-timed=""
                className={`relative border-l border-base-300 touch-none ${iso === selectedDate ? 'bg-primary/5' : ''}`}
                style={{ height: totalPx }}
                onPointerDown={e => timeCreate.begin(e, iso)}
                onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onAddAt(iso, startFromY(e.clientY, r.top)); }}
              >
                {lines.map(h => (
                  <div key={h} className="absolute left-0 right-0 border-t border-base-300/60 pointer-events-none" style={{ top: ((h - viewStart) / 60) * HOUR_PX }} />
                ))}
                {ga && (() => {
                  const top = Math.max(0, Math.min(ga.downY, ga.curY) - ga.rectTop);
                  const height = Math.min(Math.abs(ga.curY - ga.downY), totalPx - top);
                  const lo = Math.min(yToMin(ga.downY, ga.rectTop), yToMin(ga.curY, ga.rectTop));
                  const hi = Math.max(yToMin(ga.downY, ga.rectTop), yToMin(ga.curY, ga.rectTop));
                  return (
                    <div className="absolute left-0.5 right-0.5 rounded bg-primary/25 border-2 border-primary/60 pointer-events-none z-10 overflow-hidden" style={{ top, height }}>
                      <span className="text-[0.55rem] font-semibold text-primary px-1 leading-tight block">{minutesToLabel(lo)}–{minutesToLabel(hi)}</span>
                    </div>
                  );
                })()}
                {dayEvents.map(e => (
                  <EventBlock key={e.id} e={e} slot={layout[e.id]} conflict={dayEvents.some(s => s.id !== e.id && overlaps(s, e))} meta={categoryMeta[e.category]} viewStart={viewStart} viewEnd={viewEnd} totalPx={totalPx} dragging={draggingId === e.id} onStartDrag={startDrag} onToggleDone={onToggleDone} onDelete={onDelete} onEventClick={onEventClick} onResize={dur => onMoveEvent(e.id, { duration: dur })} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {preview && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-[150%] rounded-md bg-neutral text-neutral-content text-xs font-semibold px-2 py-1 shadow-lg"
          style={{ left: preview.x, top: preview.y }}
        >
          {preview.label}
        </div>
      )}
    </div>
  );
};

const EventBlock: React.FC<{
  e: PlanEvent;
  slot?: Slot;
  conflict: boolean;
  meta: CategoryMeta;
  viewStart: number;
  viewEnd: number;
  totalPx: number;
  dragging: boolean;
  onStartDrag: (payload: DragPayload, ev: React.PointerEvent) => void;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
  onEventClick: (e: PlanEvent) => void;
  onResize: (duration: number) => void;
}> = ({ e, slot, conflict, meta, viewStart, viewEnd, totalPx, dragging, onStartDrag, onToggleDone, onDelete, onEventClick, onResize }) => {
  const { previewDuration, isResizing, beginResize } = useEventResize({ duration: e.duration, start: e.start, hourPx: HOUR_PX, onCommit: onResize });
  const clampedStart = Math.max(e.start, viewStart);
  const clampedEnd = Math.min(e.start + previewDuration, viewEnd);
  if (clampedEnd <= clampedStart) return null;
  const top = ((clampedStart - viewStart) / 60) * HOUR_PX;
  const rawHeight = ((clampedEnd - clampedStart) / 60) * HOUR_PX;
  const height = Math.max(Math.min(rawHeight, totalPx - top), 12);

  const cols = slot?.cols ?? 1;
  const widthPct = 100 / cols;
  const leftPct = widthPct * (slot?.col ?? 0);

  return (
    <div className="absolute px-0.5" style={{ top, height, left: `${leftPct}%`, width: `${widthPct}%` }} onClick={ev => ev.stopPropagation()}>
      <div
        onPointerDown={ev => {
          ev.stopPropagation(); // don't also start a create-drag on the column
          const r = ev.currentTarget.getBoundingClientRect();
          // Offset from the event's TRUE start to the grab point. The block is
          // rendered from clampedStart (top of the visible window), so add back
          // the clipped-off minutes — otherwise events that begin before viewStart
          // jump on drop (review finding #1).
          const grabMin = (clampedStart - e.start) + ((ev.clientY - r.top) / HOUR_PX) * 60;
          onStartDrag({ id: e.id, grabMin }, ev);
        }}
        className={`group relative h-full rounded-md px-1.5 py-1 overflow-hidden text-white shadow-sm cursor-grab active:cursor-grabbing touch-none select-none ${e.done ? 'opacity-50' : ''} ${dragging ? 'opacity-60 ring-2 ring-primary' : ''}`}
        style={{ backgroundColor: meta.color, outline: conflict || isResizing ? `2px solid ${isResizing ? 'var(--color-primary)' : 'var(--color-error)'}` : 'none' }}
        title={`${e.title} · ${minutesToLabel(e.start)} · ${durationToLabel(e.duration)}${conflict ? ' · ⚠ overlaps another event' : ''}`}
        onClick={() => onEventClick(e)}
      >
        <div className={`text-[0.7rem] font-semibold leading-tight truncate ${e.done ? 'line-through' : ''}`}>
          {e.priority === 'high' && '🔴 '}{meta.emoji} {e.title}
        </div>
        {height > 28 && <div className="text-[0.6rem] opacity-90 leading-tight">{minutesToLabel(e.start)}</div>}
        <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
          <button className="rounded bg-black/30 hover:bg-black/50 p-0.5" onClick={ev => { ev.stopPropagation(); onToggleDone(e.id); }} aria-label="Mark done"><Check size={11} /></button>
          <button className="rounded bg-black/30 hover:bg-error p-0.5" onClick={ev => { ev.stopPropagation(); onDelete(e.id); }} aria-label="Delete event"><Trash2 size={11} /></button>
        </div>
        {/* Drag-to-resize handle (bottom edge) */}
        <div
          className="absolute bottom-0 inset-x-0 h-1.5 cursor-ns-resize flex items-end justify-center touch-none"
          onPointerDown={beginResize}
          onClick={ev => ev.stopPropagation()}
          aria-label="Resize event"
        >
          <span className="mb-px h-0.5 w-5 rounded-full bg-white/50 opacity-0 group-hover:opacity-100" />
        </div>
      </div>
    </div>
  );
};
