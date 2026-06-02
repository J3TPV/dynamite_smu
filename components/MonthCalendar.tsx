import React, { useMemo, useState } from 'react';
import { PlanEvent } from '../lib/types';
import { addDays, eventCoversDate, fromISODate, isoInRange, monthGridDays, sameMonth, toISODate, weekdayHeaders, weekdayShort } from '../lib/datetime';
import { computeDayHealth } from '../lib/analysis';
import { useCategoryMeta, useSettings } from './SettingsContext';
import { workingHours } from '../lib/settings';
import { usePointerDrag } from '../lib/usePointerDrag';
import { useDateRangeDrag } from '../lib/useCreateDrag';

type EventPatch = Partial<Pick<PlanEvent, 'date' | 'endDate'>>;

interface Props {
  events: PlanEvent[];
  monthDate: Date;       // any date within the month to render
  selectedDate: string;
  today: string;
  onSelectDate: (iso: string) => void;
  onOpenDay: (iso: string) => void;
  onEventClick: (e: PlanEvent) => void;
  onMoveEvent: (id: string, patch: EventPatch) => void;
  onAddOnDay: (iso: string) => void;
  onCreateRange: (fromISO: string, toISO: string) => void;
}

const MAX_CHIPS = 3;

const healthDot = (score: number) => (score >= 80 ? 'bg-success' : score >= 60 ? 'bg-info' : score >= 40 ? 'bg-warning' : 'bg-error');
const isSpan = (e: PlanEvent) => !!(e.allDay && e.endDate && e.endDate > e.date);
// Multi-day spans first (so they take the same top lane in every cell and read as
// a continuous bar), then single all-day, then timed by start.
const rank = (e: PlanEvent) => (isSpan(e) ? 0 : e.allDay ? 1 : 2);

export const MonthCalendar: React.FC<Props> = ({ events, monthDate, selectedDate, today, onSelectDate, onOpenDay, onEventClick, onMoveEvent, onAddOnDay, onCreateRange }) => {
  const categoryMeta = useCategoryMeta();
  const { settings } = useSettings();
  const hours = workingHours(settings);
  const days = useMemo(() => monthGridDays(monthDate, settings.weekStartsOn), [monthDate, settings.weekStartsOn]);
  const headers = weekdayHeaders(settings.weekStartsOn);

  // Expand events across every grid day they cover (multi-day spans appear in each cell).
  const byDate = useMemo(() => {
    const grid = new Set(days.map(toISODate));
    const map = new Map<string, PlanEvent[]>();
    for (const e of events) {
      const last = isSpan(e) ? e.endDate! : e.date;
      let cur = e.date;
      for (let guard = 0; cur <= last && guard < 60; guard++) {
        if (grid.has(cur)) { const l = map.get(cur) || []; l.push(e); map.set(cur, l); }
        cur = toISODate(addDays(fromISODate(cur), 1));
      }
    }
    map.forEach(list => list.sort((a, b) => (rank(a) !== rank(b) ? rank(a) - rank(b) : isSpan(a) ? a.date.localeCompare(b.date) || a.id.localeCompare(b.id) : a.allDay ? a.id.localeCompare(b.id) : a.start - b.start)));
    return map;
  }, [events, days]);

  // Span-aware move: dragging a multi-day event shifts the whole span by the same delta.
  const moveDayPatch = (id: string, targetISO: string): EventPatch => {
    const ev = events.find(e => e.id === id);
    if (ev && isSpan(ev)) {
      const delta = Math.round((fromISODate(targetISO).getTime() - fromISODate(ev.date).getTime()) / 86400000);
      return { date: targetISO, endDate: toISODate(addDays(fromISODate(ev.endDate!), delta)) };
    }
    return { date: targetISO };
  };

  const [preview, setPreview] = useState<{ x: number; y: number; label: string } | null>(null);
  const findDay = (x: number, y: number): string | null =>
    ((document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-date]') as HTMLElement | null)?.getAttribute('data-date') ?? null;
  const dayLabel = (iso: string) => { const d = fromISODate(iso); return `${weekdayShort(d)} ${d.getDate()}`; };

  const { startDrag, draggingId } = usePointerDrag(
    (payload, x, y) => { setPreview(null); const iso = findDay(x, y); if (iso) onMoveEvent(payload.id, moveDayPatch(payload.id, iso)); },
    (_payload, x, y) => { const iso = findDay(x, y); setPreview(iso ? { x, y, label: dayLabel(iso) } : null); },
  );

  // Drag across cells to create a multi-day all-day event.
  const dateCreate = useDateRangeDrag((from, to) => onCreateRange(from, to));

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 mb-1">
        {headers.map(h => <div key={h} className="text-center text-[0.65rem] uppercase tracking-wide text-base-content/50 py-1">{h}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-base-300 rounded-lg overflow-hidden border border-base-300">
        {days.map((d, idx) => {
          const iso = toISODate(d);
          const inMonth = sameMonth(d, monthDate);
          const isToday = iso === today;
          const isSel = iso === selectedDate;
          const inRange = dateCreate.active && isoInRange(iso, dateCreate.active.fromISO, dateCreate.active.toISO);
          const list = byDate.get(iso) || [];
          const visible = list.filter(e => !e.done);
          const score = visible.length ? computeDayHealth(events, iso, hours).score : -1;
          return (
            <div
              key={iso}
              data-date={iso}
              onPointerDown={e => dateCreate.begin(e, iso)}
              className={`bg-base-100 min-h-[5.5rem] p-1 flex flex-col gap-0.5 cursor-pointer transition-colors touch-none ${inMonth ? '' : 'opacity-40'} ${inRange ? 'bg-primary/20 ring-2 ring-inset ring-primary' : isSel ? 'ring-2 ring-inset ring-primary' : 'hover:bg-base-200'}`}
              title="Click to add an event · drag across days for a multi-day event"
              onClick={() => onAddOnDay(iso)}
            >
              <div className="flex items-center justify-between">
                <button
                  className={`text-xs font-semibold grid place-items-center w-5 h-5 rounded-full hover:ring-1 hover:ring-primary ${isToday ? 'bg-primary text-primary-content' : ''}`}
                  onClick={ev => { ev.stopPropagation(); onOpenDay(iso); }}
                  title="Open day"
                >{d.getDate()}</button>
                {score >= 0 && <span className={`w-1.5 h-1.5 rounded-full ${healthDot(score)}`} title={`Time-Health ${score}`} />}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {list.slice(0, MAX_CHIPS).map(e => {
                  const meta = categoryMeta[e.category];
                  const span = isSpan(e);
                  const spanStart = !span || e.date === iso;
                  const spanEnd = !span || (e.endDate ?? e.date) === iso;
                  const showTitle = spanStart || idx % 7 === 0;
                  const rounded = span ? `${spanStart ? 'rounded-l' : ''} ${spanEnd ? 'rounded-r' : ''}`.trim() || 'rounded-none' : 'rounded';
                  return (
                    <button
                      key={e.id}
                      onPointerDown={ev => { ev.stopPropagation(); startDrag({ id: e.id }, ev); }}
                      onClick={ev => { ev.stopPropagation(); onEventClick(e); }}
                      className={`text-[0.6rem] leading-tight truncate text-left px-1 py-px text-white cursor-grab active:cursor-grabbing touch-none ${rounded} ${e.done ? 'opacity-50 line-through' : ''} ${draggingId === e.id ? 'opacity-60 ring-2 ring-primary' : ''}`}
                      style={{ backgroundColor: meta.color }}
                      title={span ? `${e.title} · ${e.date} → ${e.endDate}` : e.title}
                    >
                      {span && !spanStart && '‹ '}{showTitle ? `${meta.emoji} ${e.title}` : ' '}{span && !spanEnd && ' ›'}
                    </button>
                  );
                })}
                {list.length > MAX_CHIPS && (
                  <button onClick={ev => { ev.stopPropagation(); onOpenDay(iso); }} className="text-[0.6rem] text-base-content/50 text-left px-1 hover:text-primary">
                    +{list.length - MAX_CHIPS} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
