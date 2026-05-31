import React from 'react';
import { Trash2, Check } from 'lucide-react';
import { CategoryMeta, PlanEvent } from '../lib/types';
import { addDays, durationToLabel, minutesToLabel, toISODate, weekdayShort } from '../lib/datetime';
import { overlaps } from '../lib/analysis';
import { packColumns, clockHourLines, Slot } from '../lib/layout';
import { useCategoryMeta } from './SettingsContext';

const HOUR_PX = 46;

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
}

export const WeekCalendar: React.FC<Props> = ({
  events, weekStart, selectedDate, today, dayStart, dayEnd, onSelectDate, onToggleDone, onDelete, onEventClick,
}) => {
  const categoryMeta = useCategoryMeta();
  const viewStart = dayStart;
  const viewEnd = dayEnd;
  const totalPx = ((viewEnd - viewStart) / 60) * HOUR_PX;

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const lines = clockHourLines(viewStart, viewEnd);
  const allDayByDay = days.map(d => events.filter(e => e.date === toISODate(d) && e.allDay));
  const hasAllDay = allDayByDay.some(list => list.length > 0);

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

        {/* All-day banner row */}
        {hasAllDay && (
          <div className="grid border-b border-base-300" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
            <div className="text-[0.55rem] text-base-content/40 text-right pr-1 pt-1 leading-tight">all-day</div>
            {days.map((d, i) => {
              const iso = toISODate(d);
              return (
                <div key={iso} className={`border-l border-base-300 p-0.5 space-y-0.5 min-h-[1.5rem] ${iso === selectedDate ? 'bg-primary/5' : ''}`} onClick={() => onSelectDate(iso)}>
                  {allDayByDay[i].map(e => {
                    const meta = categoryMeta[e.category];
                    return (
                      <div
                        key={e.id}
                        className={`group flex items-center gap-1 rounded px-1 py-0.5 text-white text-[0.6rem] leading-tight cursor-pointer ${e.done ? 'opacity-50 line-through' : ''}`}
                        style={{ backgroundColor: meta.color }}
                        title={`${e.title} · all day`}
                        onClick={ev => { ev.stopPropagation(); onEventClick(e); }}
                      >
                        <span className="truncate flex-1">{meta.emoji} {e.title}</span>
                        <button className="rounded bg-black/30 hover:bg-error p-0.5 hidden group-hover:block shrink-0" onClick={ev => { ev.stopPropagation(); onDelete(e.id); }} aria-label="Delete event"><Trash2 size={9} /></button>
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
            return (
              <div
                key={iso}
                className={`relative border-l border-base-300 ${iso === selectedDate ? 'bg-primary/5' : ''}`}
                style={{ height: totalPx }}
                onClick={() => onSelectDate(iso)}
              >
                {lines.map(h => (
                  <div key={h} className="absolute left-0 right-0 border-t border-base-300/60" style={{ top: ((h - viewStart) / 60) * HOUR_PX }} />
                ))}
                {dayEvents.map(e => (
                  <EventBlock key={e.id} e={e} slot={layout[e.id]} conflict={dayEvents.some(s => s.id !== e.id && overlaps(s, e))} meta={categoryMeta[e.category]} viewStart={viewStart} viewEnd={viewEnd} totalPx={totalPx} onToggleDone={onToggleDone} onDelete={onDelete} onEventClick={onEventClick} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
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
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
  onEventClick: (e: PlanEvent) => void;
}> = ({ e, slot, conflict, meta, viewStart, viewEnd, totalPx, onToggleDone, onDelete, onEventClick }) => {
  const clampedStart = Math.max(e.start, viewStart);
  const clampedEnd = Math.min(e.start + e.duration, viewEnd);
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
        className={`group relative h-full rounded-md px-1.5 py-1 overflow-hidden text-white shadow-sm cursor-pointer ${e.done ? 'opacity-50' : ''}`}
        style={{ backgroundColor: meta.color, outline: conflict ? '2px solid var(--color-error)' : 'none' }}
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
      </div>
    </div>
  );
};
