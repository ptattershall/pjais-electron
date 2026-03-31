declare global {
  interface WorkspaceSummary {
    id: string;
    name: string;
    description?: string;
  }

  interface PhaseSummary {
    id: string;
    workspaceId: string;
    name: string;
    orderIndex: number;
    templateKey: string | null;
  }

  interface TaskSummary {
    id: string;
    workspaceId: string;
    phaseId?: string | null;
    phaseName?: string | null;
    title: string;
    description?: string | null;
    status: 'pending' | 'in_progress' | 'done' | 'blocked';
    owner?: string | null;
    dueDate?: number | null;
    completedAt?: number | null;
    completionNotes?: string | null;
    evidenceDocumentId?: string | null;
    evidenceTitle?: string | null;
  }

  interface VaultItem {
    id: string;
    workspaceId: string;
    title: string;
    path: string;
    type: string;
  }

  interface MemoryRecord {
    id: string;
    workspaceId: string;
    type: string;
    description: string;
    sourceKind: string;
    sourceReference: string | null;
    createdAt: number;
  }

  interface WorkspaceSearchResult {
    memories: MemoryRecord[];
    documents: { id: string; workspaceId: string; title: string; path: string; type: string }[];
    semanticMemories?: { memory: MemoryRecord; score: number }[];
    semanticError?: string;
  }

  interface AssistantSuggestedAction {
    type: string;
    section?: string;
    title?: string;
    description?: string;
  }

  interface ChatAssistantResult {
    reply: string;
    suggestedMemory: {
      type: string;
      description: string;
      sourceKind: string;
    } | null;
    suggestedActions?: AssistantSuggestedAction[];
    context?: unknown;
    usedOllama?: boolean;
    model?: string;
    ollamaError?: string;
  }

  interface AiHealthResult {
    ok: boolean;
    baseUrl: string;
    modelNames: string[];
    error?: string;
  }

  interface WeeklyReviewState {
    version?: number;
    items: { id: string; label: string; done: boolean }[];
  }

  interface PjaisApi {
    listWorkspaces(): Promise<WorkspaceSummary[]>;
    createWorkspace(input: { name: string; description?: string }): Promise<WorkspaceSummary>;
    listPhases(workspaceId: string): Promise<PhaseSummary[]>;
    listTasks(workspaceId: string): Promise<TaskSummary[]>;
    createTask(input: {
      workspaceId: string;
      title: string;
      phaseId?: string;
      description?: string;
      owner?: string;
      dueDate?: number;
    }): Promise<TaskSummary>;
    updateTask(
      workspaceId: string,
      taskId: string,
      updates: {
        title?: string;
        status?: TaskSummary['status'];
        description?: string | null;
        owner?: string | null;
        dueDate?: number | null;
        phaseId?: string | null;
        completionNotes?: string | null;
        evidenceDocumentId?: string | null;
      }
    ): Promise<TaskSummary>;
    listVaultItems(workspaceId: string): Promise<VaultItem[]>;
    createVaultNote(
      workspaceId: string,
      input: { title: string; body?: string }
    ): Promise<VaultItem>;
    importVaultFile(workspaceId: string): Promise<VaultItem | null>;
    listMemories(workspaceId: string): Promise<MemoryRecord[]>;
    createMemory(input: {
      workspaceId: string;
      type: string;
      description: string;
      sourceKind?: string;
      sourceReference?: string;
    }): Promise<MemoryRecord>;
    updateMemory(
      workspaceId: string,
      memoryId: string,
      updates: {
        type?: string;
        description?: string;
        sourceKind?: string;
        sourceReference?: string | null;
      }
    ): Promise<MemoryRecord>;
    deleteMemory(workspaceId: string, memoryId: string): Promise<{ ok: boolean }>;
    searchWorkspace(
      workspaceId: string,
      query: string,
      options?: { semantic?: boolean }
    ): Promise<WorkspaceSearchResult>;
    getWeeklyReview(workspaceId: string): Promise<WeeklyReviewState>;
    saveWeeklyReview(workspaceId: string, state: WeeklyReviewState): Promise<WeeklyReviewState>;
    getOllamaModelSetting(workspaceId: string): Promise<string | null>;
    setOllamaModelSetting(workspaceId: string, model: string): Promise<string | null>;
    browserShow(url?: string): Promise<{ ok: boolean }>;
    browserHide(): Promise<{ ok: boolean }>;
    browserSetBounds(rect: { x: number; y: number; width: number; height: number }): Promise<void>;
    browserLoadURL(url: string): Promise<void>;
    chatWithAssistant(
      workspaceId: string,
      message: string,
      history?: { role: 'user' | 'assistant'; content: string }[]
    ): Promise<ChatAssistantResult>;
    suggestMemoryFromMessage(
      message: string
    ): Promise<{ draft: { type: string; description: string; sourceKind: string } | null }>;
    checkAiHealth(): Promise<AiHealthResult>;
  }

  interface Window {
    pjais: PjaisApi;
  }
}

declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.jpeg' {
  const src: string;
  export default src;
}
declare module '*.gif' {
  const src: string;
  export default src;
}
declare module '*.webp' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.ico' {
  const src: string;
  export default src;
}

export {};
