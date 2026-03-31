import React from 'react';
import { MemoryRouter, Routes, Route, useMatch } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AiOverlay } from './AiOverlay';
import { AssistantActionsProvider } from './AssistantActionsContext';
import {
  WorkspaceHome,
  WorkspaceDashboard,
  WorkspacePhases,
  WorkspaceTasks,
  WorkspaceVault,
  WorkspaceMemories,
  WorkspaceMaintenance,
  WorkspaceBrowser,
} from '../workspace';

const ShellRoutes: React.FC = () => {
  const match = useMatch('/workspace/:workspaceId/*');
  const workspaceId = match?.params.workspaceId;

  return (
    <AssistantActionsProvider workspaceId={workspaceId}>
      <div className="flex h-screen bg-surface-950 text-slate-100">
        <Sidebar />
        <main className="flex flex-1 flex-row overflow-hidden">
          <div className="flex-1 overflow-auto border-r border-surface-700/50">
            <Routes>
              <Route path="/" element={<WorkspaceHome />} />
              <Route path="/workspace/:workspaceId/dashboard" element={<WorkspaceDashboard />} />
              <Route path="/workspace/:workspaceId/phases" element={<WorkspacePhases />} />
              <Route path="/workspace/:workspaceId/tasks" element={<WorkspaceTasks />} />
              <Route path="/workspace/:workspaceId/vault" element={<WorkspaceVault />} />
              <Route path="/workspace/:workspaceId/memories" element={<WorkspaceMemories />} />
              <Route path="/workspace/:workspaceId/maintenance" element={<WorkspaceMaintenance />} />
              <Route path="/workspace/:workspaceId/browser" element={<WorkspaceBrowser />} />
            </Routes>
          </div>
          <AiOverlay workspaceId={workspaceId} />
        </main>
      </div>
    </AssistantActionsProvider>
  );
};

export const AppShell: React.FC = () => {
  return (
    <MemoryRouter>
      <ShellRoutes />
    </MemoryRouter>
  );
};
