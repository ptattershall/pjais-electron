import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const SECTIONS = new Set([
  'dashboard',
  'phases',
  'tasks',
  'vault',
  'memories',
  'maintenance',
  'browser',
]);

export type AssistantNavigateSection =
  | 'dashboard'
  | 'phases'
  | 'tasks'
  | 'vault'
  | 'memories'
  | 'maintenance'
  | 'browser';

export interface AssistantActionsValue {
  workspaceId?: string;
  applyNavigate: (section: string) => void;
  applyCreateTask: (title: string, description?: string) => Promise<void>;
}

const AssistantActionsContext = createContext<AssistantActionsValue | null>(null);

export const useAssistantActions = (): AssistantActionsValue | null =>
  useContext(AssistantActionsContext);

export const AssistantActionsProvider: React.FC<{
  workspaceId?: string;
  children: React.ReactNode;
}> = ({ workspaceId, children }) => {
  const navigate = useNavigate();

  const applyNavigate = useCallback(
    (section: string) => {
      if (!workspaceId) return;
      const s = String(section || '').trim();
      if (!SECTIONS.has(s)) return;
      navigate(`/workspace/${workspaceId}/${s}`);
    },
    [workspaceId, navigate],
  );

  const applyCreateTask = useCallback(
    async (title: string, description?: string) => {
      if (!workspaceId) return;
      const t = title.trim();
      if (!t) return;
      await window.pjais.createTask({
        workspaceId,
        title: t,
        description: description?.trim() || undefined,
      });
      navigate(`/workspace/${workspaceId}/tasks`);
    },
    [workspaceId, navigate],
  );

  const value = useMemo(
    () => ({ workspaceId, applyNavigate, applyCreateTask }),
    [workspaceId, applyNavigate, applyCreateTask],
  );

  return (
    <AssistantActionsContext.Provider value={value}>{children}</AssistantActionsContext.Provider>
  );
};
