import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, AlertTriangle, Info, CalendarPlus, FileText, CheckCircle2 } from 'lucide-react';
import { Category, PlanEvent } from '../lib/types';
import { durationToLabel, minutesToLabel } from '../lib/datetime';
import { parseCalendarFile, ImportResult, IMPORT_LIMITS } from '../lib/import';
import { useCategoryMeta } from './SettingsContext';

/** Unambiguous date for the preview — always includes the year, since imported
 *  events (and expanded recurrences) can span prior/next years. */
const fmtFullDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

interface Props {
  open: boolean;
  existing: PlanEvent[];
  onClose: () => void;
  onImport: (events: PlanEvent[]) => void;
}

const ACCEPT = '.ics,.ical,.ifb,.vcs,.csv,.tsv,.pst,.ost,text/calendar,text/csv';

const FORMAT_LABEL: Record<ImportResult['format'], string> = {
  ics: 'iCalendar (.ics)',
  csv: 'CSV',
  pst: 'Outlook archive (.pst)',
  unknown: 'Unknown format',
};

export const ImportCalendar: React.FC<Props> = ({ open, existing, onClose, onImport }) => {
  const categoryMeta = useCategoryMeta();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setBusy(false);
    setDragOver(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const close = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    if (file.size > IMPORT_LIMITS.maxBytes) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${IMPORT_LIMITS.maxBytes / 1024 / 1024} MB.`);
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      setResult(parseCalendarFile(file.name, text, existing));
    } catch (e) {
      setError(`Couldn’t read that file: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [existing]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const toggleRow = (i: number) =>
    setResult(r => (r ? { ...r, rows: r.rows.map((row, j) => (j === i ? { ...row, selected: !row.selected } : row)) } : r));

  const setAll = (selected: boolean) =>
    setResult(r => (r ? { ...r, rows: r.rows.map(row => ({ ...row, selected })) } : r));

  const setCategory = (i: number, category: Category) =>
    setResult(r => (r ? { ...r, rows: r.rows.map((row, j) => (j === i ? { ...row, draft: { ...row.draft, category } } : row)) } : r));

  const selectedCount = useMemo(() => result?.rows.filter(r => r.selected).length ?? 0, [result]);

  const confirm = () => {
    if (!result) return;
    onImport(result.rows.filter(r => r.selected).map(r => r.draft));
    close();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-3 sm:p-6 overflow-y-auto"
      onClick={close}
    >
      <div
        className="card bg-base-100 shadow-2xl w-full max-w-2xl my-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Import a calendar"
        onClick={e => e.stopPropagation()}
      >
        <div className="card-body p-5 gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Upload size={20} className="text-primary" /> Import a calendar
            </h2>
            <button className="btn btn-ghost btn-sm btn-square" onClick={close} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-base-content/60 -mt-1">
            Bring your schedule over from Google Calendar, Outlook or Apple Calendar. Export an
            <span className="font-semibold"> .ics</span> or <span className="font-semibold">.csv</span> from there, then drop it here.
          </p>

          {/* Drop zone */}
          <div
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary/60 hover:bg-base-200/50'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <FileText size={28} className="mx-auto text-base-content/40" />
            <p className="text-sm mt-2 font-medium">
              {busy ? 'Reading file…' : 'Drop a calendar file here, or click to choose'}
            </p>
            <p className="text-[0.7rem] text-base-content/50 mt-0.5">
              .ics · .csv — up to {IMPORT_LIMITS.maxBytes / 1024 / 1024} MB
            </p>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {error && (
            <div className="alert alert-error py-2 px-3 text-xs">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* PST / unsupported guidance */}
          {result && result.empty && result.format === 'pst' && (
            <div className="alert alert-warning items-start py-3 px-3 text-xs flex-col gap-1">
              <div className="flex items-center gap-1.5 font-semibold"><AlertTriangle size={14} /> Can’t read .pst directly</div>
              <ul className="list-disc pl-5 space-y-0.5 text-base-content/80">
                {result.diagnostics.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}

          {result && result.empty && result.format !== 'pst' && (
            <div className="alert alert-warning py-2 px-3 text-xs">
              <AlertTriangle size={14} />
              <div>{result.diagnostics.join(' ') || 'No importable events were found in that file.'}</div>
            </div>
          )}

          {/* Results */}
          {result && !result.empty && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="badge badge-primary badge-sm gap-1"><CheckCircle2 size={12} /> {FORMAT_LABEL[result.format]}</span>
                  <span className="text-base-content/60">{result.rows.length} event{result.rows.length !== 1 ? 's' : ''} found</span>
                </div>
                <div className="join">
                  <button className="btn btn-xs join-item btn-ghost" onClick={() => setAll(true)}>Select all</button>
                  <button className="btn btn-xs join-item btn-ghost" onClick={() => setAll(false)}>None</button>
                </div>
              </div>

              {result.diagnostics.length > 0 && (
                <div className="rounded-lg bg-base-200 p-2.5 text-[0.7rem] text-base-content/70 space-y-0.5">
                  {result.diagnostics.map((d, i) => (
                    <div key={i} className="flex gap-1.5"><Info size={12} className="mt-0.5 shrink-0 text-info" /><span>{d}</span></div>
                  ))}
                </div>
              )}

              {/* Preview list */}
              <ul className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {result.rows.map((row, i) => {
                  const e = row.draft;
                  const meta = categoryMeta[e.category];
                  return (
                    <li
                      key={e.id}
                      className={`flex items-center gap-2 rounded-lg p-2 border ${
                        row.selected ? 'bg-base-200 border-base-300' : 'bg-base-100 border-base-200 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={row.selected}
                        onChange={() => toggleRow(i)}
                      />
                      <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-1">
                          {e.title}
                          {row.duplicate && <span className="badge badge-xs badge-ghost">duplicate</span>}
                        </div>
                        <div className="text-[0.7rem] text-base-content/55">
                          {fmtFullDate(e.date)} · {e.allDay ? 'All day' : `${minutesToLabel(e.start)} · ${durationToLabel(e.duration)}`}
                          {e.location ? ` · ${e.location}` : ''}
                        </div>
                        {row.warnings.length > 0 && (
                          <div className="text-[0.65rem] text-warning flex items-center gap-1 mt-0.5">
                            <AlertTriangle size={10} /> {row.warnings.join(' ')}
                          </div>
                        )}
                      </div>
                      <select
                        value={e.category}
                        onChange={ev => setCategory(i, ev.target.value as Category)}
                        className="select select-bordered select-xs w-24 shrink-0"
                        aria-label="Category"
                      >
                        {Object.entries(categoryMeta).map(([k, m]) => (
                          <option key={k} value={k}>{m.emoji} {m.label}</option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>

              <div className="flex gap-2 pt-1">
                <button className="btn btn-primary btn-sm flex-1 gap-1" onClick={confirm} disabled={selectedCount === 0}>
                  <CalendarPlus size={16} /> Import {selectedCount} event{selectedCount !== 1 ? 's' : ''}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={reset}>Choose another file</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
