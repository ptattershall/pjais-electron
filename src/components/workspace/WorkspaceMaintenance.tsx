import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

type WeeklyItem = { id: string; label: string; done: boolean };

type WeeklyReviewState = {
  version?: number;
  items: WeeklyItem[];
};

export const WorkspaceMaintenance: React.FC = () => {
  const { workspaceId } = useParams<'workspaceId'>();
  const [weekly, setWeekly] = useState<WeeklyReviewState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!workspaceId) return;
    window.pjais
      .getWeeklyReview(workspaceId)
      .then((s) => setWeekly(s as WeeklyReviewState))
      .catch((e) => {
        console.error(e);
        setError('Could not load weekly review.');
      });
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (next: WeeklyReviewState) => {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await window.pjais.saveWeeklyReview(workspaceId, next);
      setWeekly(saved as WeeklyReviewState);
    } catch (e) {
      console.error(e);
      setError('Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const toggleItem = (id: string) => {
    if (!weekly) return;
    const items = weekly.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    void persist({ ...weekly, items });
  };

  const resetWeek = () => {
    if (!weekly || !window.confirm('Mark all weekly items as not done?')) return;
    const items = weekly.items.map((i) => ({ ...i, done: false }));
    void persist({ ...weekly, items });
  };

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No workspace selected.
      </div>
    );
  }

  if (!weekly) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading maintenance…
      </div>
    );
  }

  const doneCount = weekly.items.filter((i) => i.done).length;

  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">
          <span className="text-brand-blue">Maintenance</span> hub
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Weekly review checklist is saved per workspace. More modules (KPIs, calendar) can follow
          the same pattern.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <section className="card p-6 max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Weekly review</h2>
          <p className="text-sm tabular-nums text-slate-400">
            {doneCount} / {weekly.items.length} done
          </p>
        </div>
        <ul className="space-y-2">
          {weekly.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-surface-700/50 bg-surface-950/80 px-4 py-3"
            >
              <input
                type="checkbox"
                id={`wr-${item.id}`}
                checked={item.done}
                onChange={() => toggleItem(item.id)}
                disabled={busy}
                className="mt-1 rounded border-surface-600"
                aria-label={item.label}
              />
              <label
                htmlFor={`wr-${item.id}`}
                className={`flex-1 text-sm leading-relaxed cursor-pointer ${
                  item.done ? 'text-slate-500 line-through' : 'text-slate-200'
                }`}
              >
                {item.label}
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-6 rounded-lg border border-surface-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-surface-800 disabled:opacity-50"
          onClick={resetWeek}
          disabled={busy}
        >
          Reset checklist for a new week
        </button>
      </section>
    </div>
  );
};
