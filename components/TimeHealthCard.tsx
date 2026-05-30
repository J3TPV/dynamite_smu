import React from 'react';
import { Activity, Lightbulb } from 'lucide-react';
import { TimeHealth } from '../lib/types';

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-info';
  if (score >= 40) return 'text-warning';
  return 'text-error';
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-info';
  if (score >= 40) return 'bg-warning';
  return 'bg-error';
}

interface Props {
  health: TimeHealth;
  title: string;
  subtitle?: string;
  compact?: boolean;
}

export const TimeHealthCard: React.FC<Props> = ({ health, title, subtitle, compact }) => {
  return (
    <div className="card bg-base-200 shadow-md">
      <div className="card-body p-5">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={18} className="text-primary" />
          <h3 className="card-title text-base">{title}</h3>
        </div>
        {subtitle && <p className="text-xs text-base-content/60 -mt-1 mb-2">{subtitle}</p>}

        <div className="flex items-center gap-5">
          <div
            className={`radial-progress ${scoreColor(health.score)} shrink-0`}
            style={{ ['--value' as any]: health.score, ['--size' as any]: '6rem', ['--thickness' as any]: '0.55rem' }}
            role="progressbar"
            aria-label="Time-Health Index"
          >
            <div className="flex flex-col items-center leading-none">
              <span className="text-2xl font-bold">{health.score}</span>
              <span className="text-[0.6rem] opacity-60">/ 100</span>
            </div>
          </div>
          <div>
            <div className={`text-lg font-bold ${scoreColor(health.score)}`}>{health.label}</div>
            <p className="text-xs text-base-content/60">Time-Health Index</p>
          </div>
        </div>

        {!compact && (
          <div className="mt-4 space-y-2">
            {health.factors.map(f => (
              <div key={f.key} className="group" title={f.detail}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-base-content/80">{f.label}</span>
                  <span className="text-base-content/50">{Math.round(f.score)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-base-300 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor(f.score)}`} style={{ width: `${f.score}%` }} />
                </div>
                <p className="text-[0.65rem] text-base-content/45 mt-0.5">{f.detail}</p>
              </div>
            ))}
          </div>
        )}

        {!compact && health.recommendations.length > 0 && (
          <div className="mt-4 rounded-lg bg-base-100 p-3">
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-secondary">
              <Lightbulb size={14} /> Suggestions
            </div>
            <ul className="space-y-1">
              {health.recommendations.map((r, i) => (
                <li key={i} className="text-xs text-base-content/70 flex gap-1.5">
                  <span className="text-secondary">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
