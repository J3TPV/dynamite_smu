import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarClock, Activity, Clock, Sparkles, Trash2, Check, CalendarDays } from 'lucide-react';
import { PlanEvent } from './lib/types';
import { loadEvents, saveEvents } from './lib/storage';
import { computeDayHealth, computeRangeHealth } from './lib/analysis';
import {
  addDays, durationToLabel, minutesToLabel, relativeDayLabel, startOfWeek, stripTime, toISODate, weekdayLong,
} from './lib/datetime';
import { CATEGORY_META } from './lib/types';
import { VoiceCommand } from './components/VoiceCommand';
import { WeekCalendar } from './components/WeekCalendar';
import { TimeHealthCard } from './components/TimeHealthCard';

function App() {
  const now = useMemo(() => new Date(), []);
  const todayISO = toISODate(stripTime(now));

  const [events, setEvents] = useState<PlanEvent[]>(() => loadEvents());
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(now));
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [scope, setScope] = useState<'day' | 'week'>('day');

  useEffect(() => { saveEvents(events); }, [events]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i))),
    [weekStart],
  );

  const dayHealth = useMemo(() => computeDayHealth(events, selectedDate), [events, selectedDate]);
  const weekHealth = useMemo(() => computeRangeHealth(events, weekDates), [events, weekDates]);

  const addEvent = (e: PlanEvent) => {
    setEvents(prev => [...prev, e]);
    setSelectedDate(e.date);
    // jump the calendar to the week of the new event
    setWeekStart(startOfWeek(new Date(e.date + 'T00:00:00')));
  };
  const toggleDone = (id: string) => setEvents(prev => prev.map(e => (e.id === id ? { ...e, done: !e.done } : e)));
  const deleteEvent = (id: string) => setEvents(prev => prev.filter(e => e.id !== id));

  const shiftWeek = (delta: number) => {
    if (delta === 0) {
      setWeekStart(startOfWeek(now));
      setSelectedDate(todayISO);
    } else {
      setWeekStart(prev => addDays(prev, delta * 7));
    }
  };

  const dayEvents = events
    .filter(e => e.date === selectedDate)
    .sort((a, b) => a.start - b.start);

  return (
    <div className="flex flex-col min-h-screen bg-base-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-base-200/90 backdrop-blur border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary text-primary-content">
              <CalendarClock size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Cadence</h1>
              <p className="text-[0.7rem] text-base-content/60">Voice-first calendar planner</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div className="hidden sm:block">
              <div className="text-[0.65rem] text-base-content/50 leading-none">Week Time-Health</div>
              <div className={`font-bold ${weekHealth.score >= 60 ? 'text-success' : weekHealth.score >= 40 ? 'text-warning' : 'text-error'}`}>
                {weekHealth.score} · {weekHealth.label}
              </div>
            </div>
            <Activity size={22} className="text-primary" />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-5">
        <VoiceCommand events={events} now={now} onAdd={addEvent} />

        <div className="grid lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2">
            <WeekCalendar
              events={events}
              weekStart={weekStart}
              selectedDate={selectedDate}
              today={todayISO}
              onSelectDate={setSelectedDate}
              onShiftWeek={shiftWeek}
              onToggleDone={toggleDone}
              onDelete={deleteEvent}
            />
          </div>

          <div className="space-y-5">
            {/* Scope toggle */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-1.5">
                <Sparkles size={16} className="text-secondary" /> Schedule analysis
              </h2>
              <div className="join">
                <button
                  className={`btn btn-xs join-item ${scope === 'day' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setScope('day')}
                >Day</button>
                <button
                  className={`btn btn-xs join-item ${scope === 'week' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setScope('week')}
                >Week</button>
              </div>
            </div>

            {scope === 'day' ? (
              <TimeHealthCard
                health={dayHealth}
                title={relativeDayLabel(selectedDate, now)}
                subtitle={weekdayLong(new Date(selectedDate + 'T00:00:00'))}
              />
            ) : (
              <TimeHealthCard
                health={weekHealth}
                title="This week"
                subtitle={`${weekDates[0]} → ${weekDates[6]}`}
              />
            )}

            {/* Day agenda */}
            <DayAgenda
              dateISO={selectedDate}
              now={now}
              events={dayEvents}
              onToggleDone={toggleDone}
              onDelete={deleteEvent}
            />
          </div>
        </div>
      </main>

      <footer className="bg-base-200 text-base-content/60 text-center py-4 text-sm border-t border-base-300">
        <p>Cadence · plan out loud, stay in balance</p>
      </footer>
    </div>
  );
}

const DayAgenda: React.FC<{
  dateISO: string;
  now: Date;
  events: PlanEvent[];
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ dateISO, now, events, onToggleDone, onDelete }) => {
  return (
    <div className="card bg-base-200 shadow-md">
      <div className="card-body p-4">
        <h3 className="card-title text-base flex items-center gap-1.5">
          <CalendarDays size={16} className="text-primary" />
          {relativeDayLabel(dateISO, now)}
          <span className="badge badge-sm badge-ghost ml-auto">{events.length}</span>
        </h3>
        {events.length === 0 ? (
          <p className="text-sm text-base-content/50 py-3 text-center">Nothing scheduled — a clear day. 🌤️</p>
        ) : (
          <ul className="space-y-1.5">
            {events.map(e => {
              const meta = CATEGORY_META[e.category];
              return (
                <li key={e.id} className="flex items-center gap-2 rounded-lg bg-base-100 p-2 group">
                  <span className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: meta.color }} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${e.done ? 'line-through opacity-50' : ''}`}>
                      {e.priority === 'high' && '🔴 '}{meta.emoji} {e.title}
                    </div>
                    <div className="text-[0.7rem] text-base-content/55 flex items-center gap-1">
                      <Clock size={11} /> {minutesToLabel(e.start)} · {durationToLabel(e.duration)}
                      {e.createdVia === 'voice' && <span className="badge badge-xs badge-ghost ml-1">🎙 voice</span>}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100" onClick={() => onToggleDone(e.id)} aria-label="Toggle done">
                    <Check size={14} className={e.done ? 'text-success' : ''} />
                  </button>
                  <button className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 hover:text-error" onClick={() => onDelete(e.id)} aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
