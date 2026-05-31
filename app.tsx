import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarClock, CalendarDays, TrendingUp, Settings as SettingsIcon, Activity } from 'lucide-react';
import { PlanEvent } from './lib/types';
import { loadEvents, saveEvents } from './lib/storage';
import { computeRangeHealth } from './lib/analysis';
import { addDays, startOfWeek, stripTime, toISODate } from './lib/datetime';
import { workingHours } from './lib/settings';
import { SettingsProvider, useSettings } from './components/SettingsContext';
import { CalendarView, CalView } from './components/CalendarView';
import { InsightsDashboard } from './components/InsightsDashboard';
import { SettingsPage } from './components/SettingsPage';
import { EventEditor } from './components/EventEditor';
import { ImportCalendar } from './components/ImportCalendar';

type View = 'calendar' | 'insights' | 'settings';

const NAV: { id: View; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'insights', label: 'Insights', Icon: TrendingUp },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

function Shell() {
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const todayISO = toISODate(stripTime(now));

  // Keep "today" fresh if the tab is left open across midnight or refocused.
  useEffect(() => {
    const tick = () => setNow(prev => (toISODate(stripTime(new Date())) !== toISODate(stripTime(prev)) ? new Date() : prev));
    const id = setInterval(tick, 60_000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const [events, setEvents] = useState<PlanEvent[]>(() => loadEvents());
  const [view, setView] = useState<View>('calendar');
  const [calView, setCalView] = useState<CalView>('week');
  const [anchorISO, setAnchorISO] = useState<string>(todayISO);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlanEvent | null>(null);
  const [editorDate, setEditorDate] = useState<string>(todayISO);
  const [editorStart, setEditorStart] = useState<number | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);

  const saveFailed = useRef(false);
  useEffect(() => {
    const ok = saveEvents(events);
    if (!ok && !saveFailed.current) {
      saveFailed.current = true;
      alert("Couldn't save your changes — browser storage is full or unavailable. Export a backup from Settings to avoid losing data.");
    } else if (ok) {
      saveFailed.current = false;
    }
  }, [events]);

  // Event mutations
  const saveEvent = (e: PlanEvent) =>
    setEvents(prev => (prev.some(x => x.id === e.id) ? prev.map(x => (x.id === e.id ? e : x)) : [...prev, e]));
  const toggleDone = (id: string) => setEvents(prev => prev.map(e => (e.id === id ? { ...e, done: !e.done } : e)));
  const deleteEvent = (id: string) => setEvents(prev => prev.filter(e => e.id !== id));
  const importEvents = (incoming: PlanEvent[]) => {
    if (incoming.length === 0) return;
    setEvents(prev => [...prev, ...incoming]);
    const earliest = incoming.reduce((min, e) => (e.date < min ? e.date : min), incoming[0].date);
    setAnchorISO(earliest);
    setView('calendar');
  };
  const quickAdd = (e: PlanEvent) => { saveEvent(e); setAnchorISO(e.date); setView('calendar'); };

  // Editor open helpers
  const openNewEvent = (dateISO: string, startMin?: number) => {
    setEditingEvent(null); setEditorDate(dateISO); setEditorStart(startMin); setEditorOpen(true);
  };
  const openEditEvent = (e: PlanEvent) => { setEditingEvent(e); setEditorDate(e.date); setEditorStart(undefined); setEditorOpen(true); };

  const weekHealth = useMemo(() => {
    const ws = startOfWeek(now, settings.weekStartsOn);
    const dates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(ws, i)));
    return computeRangeHealth(events, dates, workingHours(settings));
  }, [events, now, settings]);

  const healthTone = weekHealth.score >= 60 ? 'text-success' : weekHealth.score >= 40 ? 'text-warning' : 'text-error';

  return (
    <div className="min-h-screen flex bg-base-100 text-base-content">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-base-300 bg-base-200/60 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-base-300">
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary text-primary-content"><CalendarClock size={20} /></div>
          <div>
            <h1 className="font-bold text-lg leading-none">Cadence</h1>
            <p className="text-[0.7rem] text-base-content/60">plan out loud</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setView(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === id ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-base-300">
          <div className="text-[0.65rem] text-base-content/50 leading-none mb-1">Week Time-Health</div>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            <span className={`font-bold ${healthTone}`}>{weekHealth.score} · {weekHealth.label}</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-base-200/90 backdrop-blur border-b border-base-300">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-primary-content"><CalendarClock size={18} /></div>
              <h1 className="font-bold text-lg leading-none">Cadence</h1>
            </div>
            <div className={`text-sm font-bold flex items-center gap-1 ${healthTone}`}><Activity size={16} /> {weekHealth.score}</div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-5 pb-24 lg:pb-8">
          {view === 'calendar' && (
            <CalendarView
              events={events} now={now} today={todayISO}
              calView={calView} onCalView={setCalView} anchorISO={anchorISO} onAnchorISO={setAnchorISO}
              onAddEvent={openNewEvent} onEditEvent={openEditEvent} onToggleDone={toggleDone} onDelete={deleteEvent}
              onOpenImport={() => setImportOpen(true)} onQuickAdd={quickAdd}
            />
          )}
          {view === 'insights' && (
            <InsightsDashboard events={events} now={now} onOpenDay={iso => { setAnchorISO(iso); setCalView('day'); setView('calendar'); }} />
          )}
          {view === 'settings' && (
            <SettingsPage events={events} onReplaceEvents={setEvents} />
          )}
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-base-200/95 backdrop-blur border-t border-base-300 flex">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium ${view === id ? 'text-primary' : 'text-base-content/60'}`}>
              <Icon size={20} /> {label}
            </button>
          ))}
        </nav>
      </div>

      <EventEditor
        open={editorOpen} event={editingEvent} defaultDate={editorDate} defaultStart={editorStart}
        events={events} now={now} onClose={() => setEditorOpen(false)} onSave={saveEvent} onDelete={deleteEvent}
      />
      <ImportCalendar open={importOpen} existing={events} onClose={() => setImportOpen(false)} onImport={importEvents} />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
