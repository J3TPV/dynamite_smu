import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Upload, CalendarDays, Clock, Check, Trash2 } from 'lucide-react';
import { PlanEvent } from '../lib/types';
import {
  addDays, addMonths, durationToLabel, eventCoversDate, fromISODate, minutesToLabel, monthYearLabel,
  relativeDayLabel, startOfWeek, stripTime, toISODate, weekdayLong,
} from '../lib/datetime';
import { computeDayHealth, computeRangeHealth } from '../lib/analysis';
import { VoiceCommand } from './VoiceCommand';
import { WeekCalendar } from './WeekCalendar';
import { DayView } from './DayView';
import { MonthCalendar } from './MonthCalendar';
import { TimeHealthCard } from './TimeHealthCard';
import { useCategoryMeta, useSettings } from './SettingsContext';
import { workingHours } from '../lib/settings';

export type CalView = 'day' | 'week' | 'month';

/** Seed values for a new event opened from a click or a drag-to-create gesture. */
export interface AddEventOptions {
  start?: number;
  duration?: number;
  allDay?: boolean;
  endDate?: string;
}

interface Props {
  events: PlanEvent[];
  now: Date;
  today: string;
  calView: CalView;
  onCalView: (v: CalView) => void;
  anchorISO: string;
  onAnchorISO: (iso: string) => void;
  onAddEvent: (dateISO: string, opts?: AddEventOptions) => void;
  onEditEvent: (e: PlanEvent) => void;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateEvent: (id: string, patch: Partial<PlanEvent>) => void;
  onOpenImport: () => void;
  onQuickAdd: (e: PlanEvent) => void;
}

export const CalendarView: React.FC<Props> = ({ events, now, today, calView, onCalView, anchorISO, onAnchorISO, onAddEvent, onEditEvent, onToggleDone, onDelete, onUpdateEvent, onOpenImport, onQuickAdd }) => {
  const { settings } = useSettings();
  const hours = workingHours(settings);
  const [scope, setScope] = useState<'day' | 'week'>('day');

  const anchor = useMemo(() => fromISODate(anchorISO), [anchorISO]);
  const selectedISO = anchorISO;
  const weekStart = useMemo(() => startOfWeek(anchor, settings.weekStartsOn), [anchor, settings.weekStartsOn]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i))), [weekStart]);

  const dayHealth = useMemo(() => computeDayHealth(events, selectedISO, hours), [events, selectedISO, hours]);
  const weekHealth = useMemo(() => computeRangeHealth(events, weekDates, hours), [events, weekDates, hours]);

  const go = (delta: number) => {
    const next = calView === 'day' ? addDays(anchor, delta) : calView === 'week' ? addDays(anchor, delta * 7) : addMonths(anchor, delta);
    onAnchorISO(toISODate(next));
  };
  const goToday = () => onAnchorISO(today);
  const setCalView = onCalView;
  const openDay = (iso: string) => { onAnchorISO(iso); onCalView('day'); };

  const periodLabel = calView === 'day' ? `${relativeDayLabel(selectedISO, now)} · ${weekdayLong(anchor)}` : monthYearLabel(calView === 'week' ? weekStart : anchor);

  return (
    <div className="space-y-4">
      <VoiceCommand events={events} now={now} onAdd={onQuickAdd} onEdit={onEditEvent} onDelete={onDelete} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="join">
            <button className="btn btn-sm btn-ghost join-item btn-square" onClick={() => go(-1)} aria-label="Previous"><ChevronLeft size={16} /></button>
            <button className="btn btn-sm btn-ghost join-item" onClick={goToday}>Today</button>
            <button className="btn btn-sm btn-ghost join-item btn-square" onClick={() => go(1)} aria-label="Next"><ChevronRight size={16} /></button>
          </div>
          <h2 className="font-bold text-base sm:text-lg">{periodLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="join">
            {(['day', 'week', 'month'] as CalView[]).map(v => (
              <button key={v} className={`btn btn-sm join-item capitalize ${calView === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCalView(v)}>{v}</button>
            ))}
          </div>
          <button className="btn btn-sm btn-ghost btn-square" onClick={onOpenImport} aria-label="Import calendar" title="Import"><Upload size={16} /></button>
          <button className="btn btn-sm btn-primary gap-1" onClick={() => onAddEvent(selectedISO)}><Plus size={16} /> <span className="hidden sm:inline">Add</span></button>
        </div>
      </div>

      {calView === 'month' ? (
        <>
          <div className="card bg-base-200 shadow-md"><div className="card-body p-3 md:p-4">
            <MonthCalendar events={events} monthDate={anchor} selectedDate={selectedISO} today={today} onSelectDate={onAnchorISO} onOpenDay={openDay} onEventClick={onEditEvent} onMoveEvent={onUpdateEvent}
              onAddOnDay={iso => { onAnchorISO(iso); onAddEvent(iso); }}
              onCreateRange={(from, to) => { onAnchorISO(from); onAddEvent(from, { allDay: true, endDate: to }); }} />
          </div></div>
          <div className="grid lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2"><TimeHealthCard health={dayHealth} title={relativeDayLabel(selectedISO, now)} subtitle={weekdayLong(anchor)} /></div>
            <Agenda dateISO={selectedISO} now={now} events={events} onEditEvent={onEditEvent} onToggleDone={onToggleDone} onDelete={onDelete} onAdd={() => onAddEvent(selectedISO)} />
          </div>
        </>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 card bg-base-200 shadow-md"><div className="card-body p-3 md:p-4">
            {calView === 'week' ? (
              <WeekCalendar events={events} weekStart={weekStart} selectedDate={selectedISO} today={today} dayStart={hours.dayStart} dayEnd={hours.dayEnd}
                onSelectDate={onAnchorISO} onShiftWeek={() => {}} onToggleDone={onToggleDone} onDelete={onDelete} onEventClick={onEditEvent}
                onMoveEvent={onUpdateEvent} onAddAt={(iso, start) => { onAnchorISO(iso); onAddEvent(iso, { start }); }}
                onCreateAt={(iso, start, duration) => { onAnchorISO(iso); onAddEvent(iso, { start, duration }); }}
                onAddAllDay={iso => { onAnchorISO(iso); onAddEvent(iso, { allDay: true }); }}
                onCreateAllDayRange={(from, to) => { onAnchorISO(from); onAddEvent(from, { allDay: true, endDate: to }); }} />
            ) : (
              <DayView dateISO={selectedISO} events={events} dayStart={hours.dayStart} dayEnd={hours.dayEnd}
                onToggleDone={onToggleDone} onDelete={onDelete} onEventClick={onEditEvent}
                onAddAt={(start, duration) => onAddEvent(selectedISO, { start, duration })}
                onMoveEvent={onUpdateEvent} />
            )}
          </div></div>

          <div className="space-y-4">
            {calView === 'week' && (
              <div className="flex items-center justify-end">
                <div className="join">
                  <button className={`btn btn-xs join-item ${scope === 'day' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setScope('day')}>Day</button>
                  <button className={`btn btn-xs join-item ${scope === 'week' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setScope('week')}>Week</button>
                </div>
              </div>
            )}
            {calView === 'week' && scope === 'week'
              ? <TimeHealthCard health={weekHealth} title="This week" subtitle={`${weekDates[0]} → ${weekDates[6]}`} />
              : <TimeHealthCard health={dayHealth} title={relativeDayLabel(selectedISO, now)} subtitle={weekdayLong(anchor)} />}
            <Agenda dateISO={selectedISO} now={now} events={events} onEditEvent={onEditEvent} onToggleDone={onToggleDone} onDelete={onDelete} onAdd={() => onAddEvent(selectedISO)} />
          </div>
        </div>
      )}
    </div>
  );
};

const Agenda: React.FC<{
  dateISO: string; now: Date; events: PlanEvent[];
  onEditEvent: (e: PlanEvent) => void; onToggleDone: (id: string) => void; onDelete: (id: string) => void; onAdd: () => void;
}> = ({ dateISO, now, events, onEditEvent, onToggleDone, onDelete, onAdd }) => {
  const categoryMeta = useCategoryMeta();
  const dayEvents = events
    .filter(e => e.date === dateISO || (e.allDay && eventCoversDate(e, dateISO)))
    .sort((a, b) => (a.allDay === b.allDay ? a.start - b.start : a.allDay ? -1 : 1));
  return (
    <div className="card bg-base-200 shadow-md">
      <div className="card-body p-4">
        <h3 className="card-title text-base flex items-center gap-1.5">
          <CalendarDays size={16} className="text-primary" /> {relativeDayLabel(dateISO, now)}
          <button className="btn btn-ghost btn-xs btn-square ml-auto" onClick={onAdd} aria-label="Add event"><Plus size={15} /></button>
        </h3>
        {dayEvents.length === 0 ? (
          <p className="text-sm text-base-content/50 py-3 text-center">Nothing scheduled — a clear day. 🌤️</p>
        ) : (
          <ul className="space-y-1.5">
            {dayEvents.map(e => {
              const meta = categoryMeta[e.category];
              return (
                <li key={e.id} className="flex items-center gap-2 rounded-lg bg-base-100 p-2 group cursor-pointer" onClick={() => onEditEvent(e)}>
                  <span className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: meta.color }} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${e.done ? 'line-through opacity-50' : ''}`}>{e.priority === 'high' && '🔴 '}{meta.emoji} {e.title}</div>
                    <div className="text-[0.7rem] text-base-content/55 flex items-center gap-1">
                      <Clock size={11} /> {e.allDay ? 'All day' : `${minutesToLabel(e.start)} · ${durationToLabel(e.duration)}`}
                      {e.createdVia === 'voice' && <span className="badge badge-xs badge-ghost ml-1">🎙 voice</span>}
                      {e.createdVia === 'import' && <span className="badge badge-xs badge-ghost ml-1">📥 imported</span>}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100" onClick={ev => { ev.stopPropagation(); onToggleDone(e.id); }} aria-label="Toggle done"><Check size={14} className={e.done ? 'text-success' : ''} /></button>
                  <button className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 hover:text-error" onClick={ev => { ev.stopPropagation(); onDelete(e.id); }} aria-label="Delete"><Trash2 size={14} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
