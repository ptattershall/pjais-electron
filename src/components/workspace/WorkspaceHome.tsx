import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreateWorkspaceForm } from '../forms';

export const WorkspaceHome: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);

  useEffect(() => {
    window.pjais
      .listWorkspaces()
      .then(setWorkspaces)
      .catch((error) => {
        console.error('Failed to load workspaces', error);
      });
  }, []);

  return (
    <div className="flex h-full flex-col gap-8 p-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">
          Welcome to <span className="text-brand-blue">PJais</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          Create a workspace for each business or project. Each workspace
          keeps its own phases, tasks, documents, and memories.
        </p>
      </section>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Workspaces
          </h2>
          <ul className="space-y-2 text-sm">
            {workspaces.length === 0 && (
              <li className="rounded-lg bg-surface-800/50 px-3 py-3 text-slate-500">
                No workspaces yet. Create one on the right.
              </li>
            )}
            {workspaces.map((ws) => (
              <li
                key={ws.id}
                className="flex items-center justify-between rounded-lg border border-surface-700/50 bg-surface-950/80 px-4 py-3 transition-colors hover:border-brand-blue/30"
              >
                <div>
                  <p className="font-semibold text-slate-200">{ws.name}</p>
                  {ws.description && (
                    <p className="mt-0.5 text-xs text-slate-500">{ws.description}</p>
                  )}
                </div>
                <Link
                  to={`/workspace/${ws.id}/dashboard`}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950 transition-colors"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Create workspace
          </h2>
          <CreateWorkspaceForm
            onCreated={(workspace) =>
              setWorkspaces((current) => [...current, workspace])
            }
          />
        </div>
      </div>
    </div>
  );
};
