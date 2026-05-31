import React, { useMemo } from 'react';
import { PlanEvent } from '../lib/types';
import { monthGridDays, sameMonth, toISODate, weekdayHeaders } from '../lib/datetime';
import { computeDayHealth } from '../lib/analysis';
import { useCategoryMeta, useSettings } from './SettingsContext';
import { workingHours } from '../lib/settings';

interface Props {
  events: PlanEvent[];
  monthDate: Date;       // any date within the month to render
  selectedDate: string;
  today: string;
  onSelectDate: (iso: string) => void;
  onOpenDay: (iso: string) => void;
  onEventClick: (e: PlanEvent) => void;
  onMoveEvent: (id: string, patch: { date: string }) => void;
  onAddOnDay: (iso: string) => void;
}

const MAX_CHIPS = 3;

const healthDot = (score: number) => (score >= 80 ? 'bg-success' : score >= 60 ? 'bg-info' : score >= 40 ? 'bg-warning' : 'bg-error');

export const MonthCalendar: React.FC<Props> = ({ events, monthDate, selectedDate, today, onSelectDate, onOpenDay, onEventClick, onMoveEvent, onAddOnDay }) => {
  const categoryMeta = useCategoryMeta();
  const { settings } = useSettings();
  const hours = workingHours(settings);
  const days = useMemo(() => monthGridDays(monthDate, settings.weekStartsOn), [monthDate, settings.weekStartsOn]);
  const headers = weekdayHeaders(settings.weekStartsOn);

  const byDate = useMemo(() => {
    const map = new Map<string, PlanEvent[]>();
    events.forEach(e => { const list = map.get(e.date) || []; list.push(e); map.set(e.date, list); });
    map.forEach(list => list.sort((a, b) => (a.allDay === b.allDay ? a.start - b.start : a.allDay ? -1 : 1)));
    return map;
  }, [events]);

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 mb-1">
        {headers.map(h => <div key={h} className="text-center text-[0.65rem] uppercase tracking-wide text-base-content/50 py-1">{h}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-base-300 rounded-lg overflow-hidden border border-base-300">
        {days.map(d => {
          const iso = toISODate(d);
          const inMonth = sameMonth(d, monthDate);
          const isToday = iso === today;
          const isSel = iso === selectedDate;
          const list = byDate.get(iso) || [];
          const visible = list.filter(e => !e.done);
          const score = visible.length ? computeDayHealth(events, iso, hours).score : -1;
          return (
            <div
              key={iso}
              className={`bg-base-100 min-h-[5.5rem] p-1 flex flex-col gap-0.5 cursor-pointer transition-colors ${inMonth ? '' : 'opacity-40'} ${isSel ? 'ring-2 ring-inset ring-primary' : 'hover:bg-base-200'}`}
              title="Click to add an event"
              onClick={() => onAddOnDay(iso)}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={e => {
                e.preventDefault();
                const raw = e.dataTransfer.getData('text/plain'); if (!raw) return;
                try { const { id } = JSON.parse(raw); if (id) onMoveEvent(id, { date: iso }); } catch { /* ignore */ }
              }}
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
                  return (
                    <button
                      key={e.id}
                      draggable
                      onDragStart={ev => { ev.stopPropagation(); ev.dataTransfer.setData('text/plain', JSON.stringify({ id: e.id })); ev.dataTransfer.effectAllowed = 'move'; }}
                      onClick={ev => { ev.stopPropagation(); onEventClick(e); }}
                      className={`text-[0.6rem] leading-tight truncate text-left rounded px-1 py-px text-white cursor-grab active:cursor-grabbing ${e.done ? 'opacity-50 line-through' : ''}`}
                      style={{ backgroundColor: meta.color }}
                      title={e.title}
                    >
                      {meta.emoji} {e.title}
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
    </div>
  );
};
