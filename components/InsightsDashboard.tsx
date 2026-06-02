import React, { useMemo, useState } from 'react';
import { Activity, Flame, TrendingUp, CheckCircle2, CalendarRange } from 'lucide-react';
import { Category, PlanEvent } from '../lib/types';
import { addDays, durationToLabel, startOfWeek, stripTime, toISODate, relativeDayLabel, weekdayShort } from '../lib/datetime';
import { computeDayHealth, computeRangeHealth } from '../lib/analysis';
import { useCategoryMeta, useSettings } from './SettingsContext';
import { workingHours } from '../lib/settings';

interface Props {
  events: PlanEvent[];
  now: Date;
  onOpenDay: (iso: string) => void;
}

type RangeMode = 'week' | 'month';

const healthColor = (s: number) => (s >= 80 ? 'var(--color-success)' : s >= 60 ? 'var(--color-info)' : s >= 40 ? 'var(--color-warning)' : 'var(--color-error)');

export const InsightsDashboard: React.FC<Props> = ({ events, now, onOpenDay }) => {
  const categoryMeta = useCategoryMeta();
  const { settings } = useSettings();
  const hours = workingHours(settings);
  const [range, setRange] = useState<RangeMode>('week');

  const dates = useMemo(() => {
    if (range === 'week') {
      const start = startOfWeek(now, settings.weekStartsOn);
      return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
    }
    const start = addDays(stripTime(now), -29);
    return Array.from({ length: 30 }, (_, i) => toISODate(addDays(start, i)));
  }, [range, now, settings.weekStartsOn]);

  const perDay = useMemo(() => dates.map(iso => ({ iso, health: computeDayHealth(events, iso, hours) })), [dates, events, hours]);
  const rangeHealth = useMemo(() => computeRangeHealth(events, dates, hours), [dates, events, hours]);

  // Category breakdown (timed minutes only, excludes all-day, across the range).
  const catTotals = useMemo(() => {
    const totals = {} as Record<Category, number>;
    (Object.keys(categoryMeta) as Category[]).forEach(k => (totals[k] = 0));
    const set = new Set(dates);
    events.forEach(e => { if (!e.allDay && set.has(e.date)) totals[e.category] += e.duration; });
    const max = Math.max(1, ...Object.values(totals));
    return { totals, max, grand: Object.values(totals).reduce((s, n) => s + n, 0) };
  }, [events, dates, categoryMeta]);

  // Completion + busy/light days.
  const stats = useMemo(() => {
    const set = new Set(dates);
    const inRange = events.filter(e => set.has(e.date));
    const done = inRange.filter(e => e.done).length;
    const totalMin = inRange.filter(e => !e.allDay).reduce((s, e) => s + e.duration, 0);
    const busiest = [...perDay].sort((a, b) => b.health.loadMinutes - a.health.loadMinutes)[0];
    const lightest = [...perDay].filter(d => d.health.loadMinutes > 0).sort((a, b) => a.health.loadMinutes - b.health.loadMinutes)[0];

    // Current streak of "Balanced or better" days, counting back from today.
    // Empty days are neutral — a free day neither breaks nor extends the streak.
    let streak = 0;
    for (let i = 0; i <= 120; i++) {
      const iso = toISODate(addDays(stripTime(now), -i));
      const dayEvents = events.filter(e => e.date === iso && !e.allDay);
      if (dayEvents.length === 0) continue;
      if (computeDayHealth(events, iso, hours).score >= 60) streak++; else break;
    }
    return { completion: inRange.length ? Math.round((done / inRange.length) * 100) : 0, count: inRange.length, totalMin, busiest, lightest, streak };
  }, [events, dates, perDay, now, hours]);

  const maxBar = 100;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp size={20} className="text-primary" /> Insights</h2>
        <div className="join">
          <button className={`btn btn-sm join-item ${range === 'week' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRange('week')}>This week</button>
          <button className={`btn btn-sm join-item ${range === 'month' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRange('month')}>30 days</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Activity size={18} />} label="Avg Time-Health" value={`${rangeHealth.score}`} sub={rangeHealth.label} tone={healthColor(rangeHealth.score)} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Completion" value={`${stats.completion}%`} sub={`${stats.count} events`} />
        <StatCard icon={<CalendarRange size={18} />} label="Scheduled" value={durationToLabel(stats.totalMin)} sub={`${range === 'week' ? '7' : '30'} days`} />
        <StatCard icon={<Flame size={18} />} label="Balance streak" value={`${stats.streak}`} sub={stats.streak === 1 ? 'day' : 'days'} tone={stats.streak > 0 ? 'var(--color-success)' : undefined} />
      </div>

      {/* Health trend */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4">
          <h3 className="font-bold text-sm mb-1">Time-Health trend</h3>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {perDay.map(({ iso, health }) => {
              const d = new Date(iso + 'T00:00:00');
              const has = events.some(e => e.date === iso && !e.allDay);
              return (
                <button
                  key={iso}
                  onClick={() => onOpenDay(iso)}
                  className="flex-1 flex flex-col items-center justify-end gap-1 group min-w-0"
                  title={`${relativeDayLabel(iso, now)} · ${has ? health.score : '—'}`}
                >
                  <div className="w-full rounded-t transition-all group-hover:opacity-80" style={{ height: `${has ? (health.score / maxBar) * 96 : 2}px`, backgroundColor: has ? healthColor(health.score) : 'var(--color-base-300)' }} />
                  {range === 'week' && <span className="text-[0.55rem] text-base-content/50">{weekdayShort(d)}</span>}
                </button>
              );
            })}
          </div>
          {range === 'month' && <p className="text-[0.65rem] text-base-content/40 mt-1 text-center">Last 30 days — tap a bar to open that day.</p>}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4">
          <h3 className="font-bold text-sm mb-2">Where your time goes</h3>
          {catTotals.grand === 0 ? (
            <p className="text-sm text-base-content/50 py-2">No timed events in this range yet.</p>
          ) : (
            <div className="space-y-2">
              {(Object.keys(categoryMeta) as Category[])
                .filter(k => catTotals.totals[k] > 0)
                .sort((a, b) => catTotals.totals[b] - catTotals.totals[a])
                .map(k => {
                  const meta = categoryMeta[k];
                  const mins = catTotals.totals[k];
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-sm w-24 shrink-0 truncate">{meta.emoji} {meta.label}</span>
                      <div className="flex-1 bg-base-300 rounded-full h-3 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(mins / catTotals.max) * 100}%`, backgroundColor: meta.color }} />
                      </div>
                      <span className="text-xs text-base-content/60 w-16 text-right">{durationToLabel(mins)}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Busiest / lightest + tips */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4 gap-1.5">
            <h3 className="font-bold text-sm">Notable days</h3>
            {stats.busiest && stats.busiest.health.loadMinutes > 0 ? (
              <button className="text-sm text-left hover:text-primary" onClick={() => onOpenDay(stats.busiest!.iso)}>
                🔥 Busiest: <span className="font-medium">{relativeDayLabel(stats.busiest.iso, now)}</span> — {durationToLabel(stats.busiest.health.loadMinutes)} of demanding work
              </button>
            ) : <p className="text-sm text-base-content/50">No demanding load in range.</p>}
            {stats.lightest && (
              <button className="text-sm text-left hover:text-primary" onClick={() => onOpenDay(stats.lightest!.iso)}>
                🌤️ Lightest: <span className="font-medium">{relativeDayLabel(stats.lightest.iso, now)}</span> — {durationToLabel(stats.lightest.health.loadMinutes)}
              </button>
            )}
          </div>
        </div>
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4 gap-1.5">
            <h3 className="font-bold text-sm">Recommendations</h3>
            {rangeHealth.recommendations.map((r, i) => (
              <p key={i} className="text-sm text-base-content/75 flex gap-1.5">💡 <span>{r}</span></p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; tone?: string }> = ({ icon, label, value, sub, tone }) => (
  <div className="card bg-base-200 shadow-sm">
    <div className="card-body p-3.5 gap-0.5">
      <div className="flex items-center gap-1.5 text-base-content/60 text-xs"><span style={{ color: tone }}>{icon}</span> {label}</div>
      <div className="text-2xl font-bold" style={{ color: tone }}>{value}</div>
      {sub && <div className="text-[0.7rem] text-base-content/50">{sub}</div>}
    </div>
  </div>
);
