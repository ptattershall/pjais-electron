import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { WORKSPACE_NAV_ITEMS } from '../../lib/constants';

export const Sidebar: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentWorkspaceId =
    pathParts[0] === 'workspace' && pathParts.length >= 3 ? pathParts[1] : null;
  const currentSection = currentWorkspaceId && pathParts.length >= 3 ? pathParts[2] : null;
  const currentWorkspace = currentWorkspaceId
    ? workspaces.find((w) => w.id === currentWorkspaceId)
    : null;

  useEffect(() => {
    window.pjais
      .listWorkspaces()
      .then(setWorkspaces)
      .catch((error) => {
        console.error('Failed to load workspaces', error);
      });
  }, []);

  return (
    <aside className="flex w-64 flex-col border-r border-surface-700/50 bg-surface-900 shadow-glow-blue">
      <div className="px-4 py-4 border-b border-surface-700/50">
        <button
          type="button"
          className="text-left font-bold text-lg tracking-tight text-brand-blue hover:text-brand-blue-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900 rounded"
          onClick={() => navigate('/')}
          aria-label="Go to home"
        >
          PJais
        </button>
        <p className="mt-1.5 text-xs text-slate-400 font-medium">
          Local-first AI business OS
        </p>
      </div>
      <nav className="flex-1 overflow-auto px-3 py-4 text-sm" aria-label="Main navigation">
        <p className="mb-2.5 px-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Workspaces
        </p>
        <ul className="space-y-0.5">
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-slate-200 hover:bg-brand-blue/10 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-inset transition-colors"
                onClick={() => navigate(`/workspace/${ws.id}/dashboard`)}
                aria-label={`Open workspace ${ws.name}`}
              >
                {ws.name}
              </button>
            </li>
          ))}
        </ul>

        {currentWorkspaceId && (
          <>
            <p className="mb-2.5 mt-6 px-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              {currentWorkspace?.name ?? 'Workspace'}
            </p>
            <ul className="space-y-0.5" aria-label="Workspace sections">
              {WORKSPACE_NAV_ITEMS.map((item) => {
                const isActive = currentSection === item.path;
                const to = `/workspace/${currentWorkspaceId}/${item.path}`;
                return (
                  <li key={item.path}>
                    <Link
                      to={to}
                      className={`block w-full rounded-lg px-3 py-2 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-inset transition-colors ${
                        isActive
                          ? 'bg-brand-blue/20 text-brand-blue border-l-2 border-brand-blue -ml-px pl-[11px]'
                          : 'text-slate-300 hover:bg-brand-blue/10 hover:text-slate-100'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>
    </aside>
  );
};
