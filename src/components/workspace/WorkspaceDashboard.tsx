import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export const WorkspaceDashboard: React.FC = () => {
  const { workspaceId } = useParams<'workspaceId'>();
  const [phases, setPhases] = useState<PhaseSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([window.pjais.listPhases(workspaceId), window.pjais.listTasks(workspaceId)])
      .then(([p, t]) => {
        setPhases(p);
        setTasks(t);
      })
      .catch((e) => console.error('Failed to load dashboard', e));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No workspace selected.
      </div>
    );
  }

  const openTasksByPhase = (phaseId: string) =>
    tasks.filter((t) => t.phaseId === phaseId && t.status !== 'done').length;

  const unassignedOpen = tasks.filter(
    (t) => (!t.phaseId || t.phaseId === '') && t.status !== 'done',
  ).length;

  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-50">
        Workspace <span className="text-brand-blue">dashboard</span>
      </h1>
      <p className="max-w-xl text-sm leading-relaxed text-slate-400">
        Phases guide your business lifecycle. Open tasks are counted per phase. Tasks without a
        phase appear in “Unassigned”.
      </p>
      <section className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          Phases & open tasks
        </h2>
        <ul className="space-y-2">
          {phases.map((phase) => (
            <li
              key={phase.id}
              className="flex items-center justify-between rounded-lg border border-surface-700/50 bg-surface-950/80 px-4 py-3 text-sm"
            >
              <span className="font-medium text-slate-200">{phase.name}</span>
              <span className="tabular-nums text-slate-400">
                {openTasksByPhase(phase.id)} open
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between rounded-lg border border-dashed border-surface-600/60 bg-surface-950/40 px-4 py-3 text-sm text-slate-500">
            <span>Unassigned phase</span>
            <span className="tabular-nums">{unassignedOpen} open</span>
          </li>
        </ul>
      </section>
    </div>
  );
};
