import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TASK_STATUSES } from '../../lib/constants';

const formatDue = (ts: number | null | undefined) => {
  if (ts == null) return null;
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
};

export const WorkspacePhases: React.FC = () => {
  const { workspaceId } = useParams<'workspaceId'>();
  const [phases, setPhases] = useState<PhaseSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([window.pjais.listPhases(workspaceId), window.pjais.listTasks(workspaceId)])
      .then(([p, t]) => {
        setPhases(p);
        setTasks(t);
        const initial: Record<string, boolean> = {};
        p.forEach((ph) => {
          initial[ph.id] = true;
        });
        initial.__unassigned = true;
        setExpanded(initial);
      })
      .catch((e) => console.error('Failed to load phases', e));
  }, [workspaceId]);

  const tasksByPhaseId = useMemo(() => {
    const map = new Map<string, TaskSummary[]>();
    const unassigned: TaskSummary[] = [];
    for (const t of tasks) {
      if (!t.phaseId || t.phaseId === '') {
        unassigned.push(t);
        continue;
      }
      const list = map.get(t.phaseId) ?? [];
      list.push(t);
      map.set(t.phaseId, list);
    }
    return { map, unassigned };
  }, [tasks]);

  const togglePhase = (id: string) => {
    setExpanded((prev) => {
      const wasOpen = prev[id] !== false;
      return { ...prev, [id]: !wasOpen };
    });
  };

  const onPhaseKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePhase(id);
    }
  };

  const renderTaskRow = (task: TaskSummary) => (
    <li
      key={task.id}
      className={`rounded-lg border px-3 py-2.5 text-sm ${
        task.status === 'done'
          ? 'border-surface-700/40 bg-surface-950/50 opacity-75'
          : 'border-surface-700/50 bg-surface-950/80'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`font-medium ${
              task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-200'
            }`}
          >
            {task.title}
          </p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            {TASK_STATUSES.find((s) => s.value === task.status)?.label ?? task.status}
          </p>
          {task.description && (
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">{task.description}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500">
            {task.owner && <span>Owner: {task.owner}</span>}
            {formatDue(task.dueDate) && <span>Due: {formatDue(task.dueDate)}</span>}
          </div>
        </div>
        <Link
          to={`/workspace/${workspaceId}/tasks`}
          className="shrink-0 text-xs font-semibold text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded"
        >
          Open in Tasks
        </Link>
      </div>
    </li>
  );

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No workspace selected.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">
          Business <span className="text-brand-blue">phases</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Each phase represents a stage in your workspace lifecycle. Expand a phase to see its
          tasks, or add tasks from the Tasks screen with the phase assigned.
        </p>
      </header>

      <ul className="flex flex-col gap-3" aria-label="Phases and tasks">
        {phases.map((phase) => {
          const phaseTasks = tasksByPhaseId.map.get(phase.id) ?? [];
          const isOpen = expanded[phase.id] !== false;
          const openCount = phaseTasks.filter((t) => t.status !== 'done').length;
          return (
            <li key={phase.id} className="card overflow-hidden">
              <button
                type="button"
                id={`phase-head-${phase.id}`}
                aria-expanded={isOpen}
                aria-controls={`phase-panel-${phase.id}`}
                onClick={() => togglePhase(phase.id)}
                onKeyDown={(e) => onPhaseKeyDown(e, phase.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
              >
                <div>
                  <span className="text-base font-semibold text-slate-100">{phase.name}</span>
                  {phase.templateKey && (
                    <span className="ml-2 text-xs font-mono text-slate-500">{phase.templateKey}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm tabular-nums text-slate-400">
                  <span>
                    {openCount} open{phaseTasks.length !== openCount ? ` · ${phaseTasks.length} total` : ''}
                  </span>
                  <span className="text-brand-blue" aria-hidden>
                    {isOpen ? '▼' : '▶'}
                  </span>
                </div>
              </button>
              {isOpen && (
                <div
                  id={`phase-panel-${phase.id}`}
                  role="region"
                  aria-labelledby={`phase-head-${phase.id}`}
                  className="border-t border-surface-700/50 px-5 py-4"
                >
                  {phaseTasks.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No tasks in this phase yet.{' '}
                      <Link
                        to={`/workspace/${workspaceId}/tasks`}
                        className="font-semibold text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded"
                      >
                        Create a task
                      </Link>{' '}
                      and assign this phase.
                    </p>
                  ) : (
                    <ul className="space-y-2">{phaseTasks.map(renderTaskRow)}</ul>
                  )}
                </div>
              )}
            </li>
          );
        })}

        <li className="card overflow-hidden border-dashed border-surface-600/60">
          <button
            type="button"
            id="phase-head-unassigned"
            aria-expanded={expanded.__unassigned !== false}
            aria-controls="phase-panel-unassigned"
            onClick={() => togglePhase('__unassigned')}
            onKeyDown={(e) => onPhaseKeyDown(e, '__unassigned')}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
          >
            <span className="text-base font-semibold text-slate-400">Unassigned tasks</span>
            <div className="flex items-center gap-3 text-sm tabular-nums text-slate-400">
              <span>{tasksByPhaseId.unassigned.length}</span>
              <span className="text-brand-blue" aria-hidden>
                {expanded.__unassigned !== false ? '▼' : '▶'}
              </span>
            </div>
          </button>
          {expanded.__unassigned !== false && (
            <div
              id="phase-panel-unassigned"
              role="region"
              aria-labelledby="phase-head-unassigned"
              className="border-t border-surface-700/50 px-5 py-4"
            >
              {tasksByPhaseId.unassigned.length === 0 ? (
                <p className="text-sm text-slate-500">All tasks are assigned to a phase.</p>
              ) : (
                <ul className="space-y-2">{tasksByPhaseId.unassigned.map(renderTaskRow)}</ul>
              )}
            </div>
          )}
        </li>
      </ul>
    </div>
  );
};
