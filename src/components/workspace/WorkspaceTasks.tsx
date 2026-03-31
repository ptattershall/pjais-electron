import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TASK_STATUSES } from '../../lib/constants';
import { CreateTaskForm, TaskEditForm } from '../forms';

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

export const WorkspaceTasks: React.FC = () => {
  const { workspaceId } = useParams<'workspaceId'>();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }
    window.pjais
      .listTasks(workspaceId)
      .then(setTasks)
      .catch((error) => {
        console.error('Failed to load tasks', error);
      });
  }, [workspaceId]);

  const handleMarkDone = async (task: TaskSummary) => {
    if (!workspaceId || task.status === 'done') return;
    try {
      const updated = await window.pjais.updateTask(workspaceId, task.id, { status: 'done' });
      setTasks((current) =>
        current.map((t) => (t.id === updated.id ? updated : t))
      );
    } catch (error) {
      console.error('Failed to update task', error);
    }
  };

  const handleTaskUpdated = (updated: TaskSummary) => {
    setTasks((current) =>
      current.map((t) => (t.id === updated.id ? updated : t))
    );
    setEditingTaskId(null);
  };

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
          <span className="text-brand-blue">Tasks</span>
        </h1>
      </header>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Task list
          </h2>
          <ul className="space-y-2 text-sm">
            {tasks.length === 0 && (
              <li className="rounded-lg bg-surface-800/50 px-4 py-3 text-slate-500">
                No tasks yet. Create one on the right.
              </li>
            )}
            {tasks.map((task) => (
              <li
                key={task.id}
                className={`rounded-lg border px-4 py-3 transition-colors ${
                  task.status === 'done'
                    ? 'border-surface-700/50 bg-surface-950/60 opacity-80'
                    : 'border-surface-700/50 bg-surface-950/80 hover:border-brand-blue/20'
                }`}
              >
                {editingTaskId === task.id ? (
                  <TaskEditForm
                    task={task}
                    workspaceId={workspaceId}
                    onSaved={handleTaskUpdated}
                    onCancel={() => setEditingTaskId(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p
                        className={`font-semibold ${
                          task.status === 'done'
                            ? 'text-slate-500 line-through'
                            : 'text-slate-200'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        {TASK_STATUSES.find((s) => s.value === task.status)?.label ?? task.status}
                        {task.phaseName ? ` · ${task.phaseName}` : ''}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {task.owner && <span>Owner: {task.owner}</span>}
                        {formatDue(task.dueDate) && <span>Due: {formatDue(task.dueDate)}</span>}
                        {task.evidenceTitle && (
                          <span className="text-brand-yellow/90">Evidence: {task.evidenceTitle}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {task.status !== 'done' && (
                        <button
                          type="button"
                          onClick={() => handleMarkDone(task)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-brand-yellow hover:bg-brand-yellow/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950"
                          aria-label={`Mark "${task.title}" as done`}
                        >
                          Mark done
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingTaskId(task.id)}
                        className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950"
                        aria-label={`Edit "${task.title}"`}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Create task
          </h2>
          <CreateTaskForm
            onCreated={(task) => setTasks((current) => [...current, task])}
            workspaceId={workspaceId}
          />
        </section>
      </div>
    </div>
  );
};
