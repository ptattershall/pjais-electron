const { app, BrowserWindow, BrowserView, ipcMain, session, dialog } = require('electron');
const store = require('./workspace-store');
const ollama = require('./ollama');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow = null;
let appBrowserView = null;

// Content-Security-Policy: strict in production, allow unsafe-eval in dev for webpack HMR
// https://electronjs.org/docs/latest/tutorial/security#7-define-a-content-security-policy
function applyContentSecurityPolicy() {
  const isDev = !app.isPackaged;
  const scriptSrc = isDev ? "script-src 'self' 'unsafe-eval'" : "script-src 'self'";
  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data:",
    "connect-src 'self' ws://localhost:* wss://localhost:* https://fonts.googleapis.com https://fonts.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

async function pickModelForWorkspace(workspaceId, modelNames) {
  const preferred = await store.getPreferredOllamaModel(workspaceId);
  return ollama.pickModel(modelNames, preferred || undefined);
}

async function embedMemoryRecord(workspaceId, record) {
  const health = await ollama.ollamaHealth();
  if (!health.ok || health.modelNames.length === 0) {
    return;
  }
  try {
    const model = await pickModelForWorkspace(workspaceId, health.modelNames);
    const text = store.memoryEmbeddingText(record.type, record.description);
    const vec = await ollama.ollamaEmbed(health.baseUrl, model, text);
    await store.upsertMemoryEmbedding(workspaceId, record.id, vec);
  } catch (e) {
    console.error('Memory embedding failed', e);
  }
}

async function embedVaultNoteDocument(workspaceId, doc) {
  const health = await ollama.ollamaHealth();
  if (!health.ok || health.modelNames.length === 0) {
    return;
  }
  try {
    const model = await pickModelForWorkspace(workspaceId, health.modelNames);
    const text = await store.readVaultDocumentText(workspaceId, doc.path, 12000);
    if (!text) {
      return;
    }
    const vec = await ollama.ollamaEmbed(health.baseUrl, model, text);
    await store.upsertDocumentEmbedding(workspaceId, doc.id, vec);
  } catch (e) {
    console.error('Document embedding failed', e);
  }
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', () => {
    const win = mainWindow;
    if (appBrowserView && win) {
      try {
        win.removeBrowserView(appBrowserView);
      } catch {
        /* ignore */
      }
    }
  });

  mainWindow.on('closed', () => {
    appBrowserView = null;
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  applyContentSecurityPolicy();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const TASK_STATUSES = ['pending', 'in_progress', 'done', 'blocked'];

function registerIpcHandlers() {
  ipcMain.handle('workspace:list', async () => {
    return store.listWorkspaces();
  });

  ipcMain.handle('workspace:create', async (_event, input) => {
    if (!input || typeof input.name !== 'string' || input.name.trim() === '') {
      throw new Error('Workspace name is required');
    }
    return store.createWorkspace({
      name: input.name.trim(),
      description:
        typeof input.description === 'string' && input.description.trim().length > 0
          ? input.description.trim()
          : undefined,
    });
  });

  ipcMain.handle('phase:list', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    return store.listPhases(payload.workspaceId);
  });

  ipcMain.handle('task:list', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    return store.listTasks(payload.workspaceId);
  });

  ipcMain.handle('task:create', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    if (typeof payload.title !== 'string' || payload.title.trim() === '') {
      throw new Error('Task title is required');
    }
    return store.createTask({
      workspaceId: payload.workspaceId,
      title: payload.title.trim(),
      phaseId: typeof payload.phaseId === 'string' ? payload.phaseId : undefined,
      description: typeof payload.description === 'string' ? payload.description : undefined,
      owner: typeof payload.owner === 'string' ? payload.owner : undefined,
      dueDate: typeof payload.dueDate === 'number' ? payload.dueDate : undefined,
    });
  });

  ipcMain.handle('task:update', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    if (typeof payload.taskId !== 'string' || payload.taskId.trim() === '') {
      throw new Error('taskId is required');
    }
    const updates = {};
    if (payload.title !== undefined) {
      if (typeof payload.title !== 'string' || payload.title.trim() === '') {
        throw new Error('Task title cannot be empty');
      }
      updates.title = payload.title.trim();
    }
    if (payload.status !== undefined) {
      if (!TASK_STATUSES.includes(payload.status)) {
        throw new Error('Invalid task status');
      }
      updates.status = payload.status;
    }
    if (payload.description !== undefined) {
      updates.description =
        payload.description === null ? null : String(payload.description);
    }
    if (payload.owner !== undefined) {
      updates.owner = payload.owner === null || payload.owner === '' ? null : String(payload.owner);
    }
    if (payload.dueDate !== undefined) {
      updates.dueDate =
        payload.dueDate === null || payload.dueDate === undefined ? null : payload.dueDate;
    }
    if (payload.phaseId !== undefined) {
      updates.phaseId =
        payload.phaseId === null || payload.phaseId === '' ? null : String(payload.phaseId);
    }
    if (payload.completionNotes !== undefined) {
      updates.completionNotes =
        payload.completionNotes === null || payload.completionNotes === ''
          ? null
          : String(payload.completionNotes);
    }
    if (payload.evidenceDocumentId !== undefined) {
      updates.evidenceDocumentId =
        payload.evidenceDocumentId === null || payload.evidenceDocumentId === ''
          ? null
          : String(payload.evidenceDocumentId);
    }
    if (Object.keys(updates).length === 0) {
      throw new Error('Provide at least one field to update');
    }
    return store.updateTask(payload.workspaceId, payload.taskId, updates);
  });

  ipcMain.handle('vault:list', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    return store.listVaultItems(payload.workspaceId);
  });

  ipcMain.handle('vault:createNote', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    const doc = await store.createVaultNote(payload.workspaceId, {
      title: payload.title,
      body: typeof payload.body === 'string' ? payload.body : '',
    });
    void embedVaultNoteDocument(payload.workspaceId, doc);
    return doc;
  });

  ipcMain.handle('vault:importFile', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Import file into vault',
    });
    if (result.canceled || !result.filePaths[0]) {
      return null;
    }
    return store.importVaultFile(payload.workspaceId, result.filePaths[0]);
  });

  ipcMain.handle('memory:list', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    return store.listMemories(payload.workspaceId);
  });

  ipcMain.handle('memory:create', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    if (typeof payload.type !== 'string' || payload.type.trim() === '') {
      throw new Error('Memory type is required');
    }
    if (typeof payload.description !== 'string' || payload.description.trim() === '') {
      throw new Error('Memory description is required');
    }
    const sourceKind =
      typeof payload.sourceKind === 'string' && payload.sourceKind.trim() !== ''
        ? payload.sourceKind.trim()
        : 'manual';
    const created = await store.createMemory({
      workspaceId: payload.workspaceId,
      type: payload.type.trim(),
      description: payload.description.trim(),
      sourceKind,
      sourceReference:
        typeof payload.sourceReference === 'string' ? payload.sourceReference : undefined,
    });
    void embedMemoryRecord(payload.workspaceId, created);
    return created;
  });

  ipcMain.handle('memory:update', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    if (typeof payload.memoryId !== 'string') {
      throw new Error('memoryId is required');
    }
    const updates = {};
    if (payload.type !== undefined) updates.type = String(payload.type);
    if (payload.description !== undefined) updates.description = String(payload.description);
    if (payload.sourceKind !== undefined) updates.sourceKind = String(payload.sourceKind);
    if (payload.sourceReference !== undefined) {
      updates.sourceReference = payload.sourceReference;
    }
    if (Object.keys(updates).length === 0) {
      throw new Error('Provide at least one field to update');
    }
    const updated = await store.updateMemory(payload.workspaceId, payload.memoryId, updates);
    void embedMemoryRecord(payload.workspaceId, updated);
    return updated;
  });

  ipcMain.handle('memory:delete', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    if (typeof payload.memoryId !== 'string') {
      throw new Error('memoryId is required');
    }
    await store.deleteMemory(payload.workspaceId, payload.memoryId);
    return { ok: true };
  });

  ipcMain.handle('maintenance:getWeeklyReview', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    return store.getWeeklyReview(payload.workspaceId);
  });

  ipcMain.handle('maintenance:saveWeeklyReview', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    if (!payload.state || typeof payload.state !== 'object') {
      throw new Error('state is required');
    }
    return store.saveWeeklyReview(payload.workspaceId, payload.state);
  });

  ipcMain.handle('settings:getOllamaModel', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    return store.getPreferredOllamaModel(payload.workspaceId);
  });

  ipcMain.handle('settings:setOllamaModel', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    return store.setPreferredOllamaModel(
      payload.workspaceId,
      typeof payload.model === 'string' ? payload.model : '',
    );
  });

  ipcMain.handle('workspace:search', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    if (typeof payload.query !== 'string') {
      throw new Error('query is required');
    }
    const keyword = await store.searchWorkspace(payload.workspaceId, payload.query);
    if (!payload.semantic) {
      return { ...keyword, semanticMemories: [] };
    }
    const q = payload.query.trim();
    if (!q) {
      return { ...keyword, semanticMemories: [] };
    }
    const health = await ollama.ollamaHealth();
    if (!health.ok || health.modelNames.length === 0) {
      return { ...keyword, semanticMemories: [], semanticError: health.error || 'No models for embeddings' };
    }
    try {
      const model = await pickModelForWorkspace(payload.workspaceId, health.modelNames);
      const vec = await ollama.ollamaEmbed(health.baseUrl, model, q);
      const semanticMemories = await store.semanticSearchMemories(payload.workspaceId, vec, 12);
      const seen = new Set(keyword.memories.map((m) => m.id));
      const mergedMemories = [...keyword.memories];
      for (const row of semanticMemories) {
        if (!seen.has(row.memory.id)) {
          mergedMemories.push(row.memory);
          seen.add(row.memory.id);
        }
      }
      return { memories: mergedMemories, documents: keyword.documents, semanticMemories };
    } catch (e) {
      return {
        ...keyword,
        semanticMemories: [],
        semanticError: e instanceof Error ? e.message : String(e),
      };
    }
  });

  ipcMain.handle('browser:show', async (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return { ok: false };
    }
    if (!appBrowserView) {
      appBrowserView = new BrowserView({
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
    }
    win.addBrowserView(appBrowserView);
    const url =
      typeof payload?.url === 'string' && payload.url.trim() !== ''
        ? payload.url.trim()
        : 'https://duckduckgo.com/';
    await appBrowserView.webContents.loadURL(url);
    return { ok: true };
  });

  ipcMain.handle('browser:hide', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (appBrowserView && win) {
      try {
        win.removeBrowserView(appBrowserView);
      } catch {
        /* ignore */
      }
    }
    return { ok: true };
  });

  ipcMain.handle('browser:setBounds', (_event, rect) => {
    if (!appBrowserView || !rect) {
      return;
    }
    appBrowserView.setBounds({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.max(80, Math.round(rect.width)),
      height: Math.max(80, Math.round(rect.height)),
    });
  });

  ipcMain.handle('browser:loadURL', async (_event, url) => {
    if (appBrowserView && typeof url === 'string' && url.trim() !== '') {
      await appBrowserView.webContents.loadURL(url.trim());
    }
  });

  ipcMain.handle('ai:health', async () => {
    return ollama.ollamaHealth();
  });

  ipcMain.handle('ai:chat', async (_event, payload) => {
    if (!payload || typeof payload.workspaceId !== 'string') {
      throw new Error('workspaceId is required');
    }
    const message = typeof payload.message === 'string' ? payload.message : '';
    const history = Array.isArray(payload.history) ? payload.history : [];

    const health = await ollama.ollamaHealth();
    if (health.ok && health.modelNames.length > 0) {
      try {
        const systemPrompt = await store.buildAssistantSystemPrompt(payload.workspaceId);
        const model = await pickModelForWorkspace(payload.workspaceId, health.modelNames);
        const trimmedHistory = history
          .filter(
            (h) =>
              h &&
              (h.role === 'user' || h.role === 'assistant') &&
              typeof h.content === 'string',
          )
          .slice(-20)
          .map((h) => ({ role: h.role, content: h.content }));
        const msgs = [
          { role: 'system', content: systemPrompt },
          ...trimmedHistory,
          { role: 'user', content: message },
        ];
        const rawReply = await ollama.ollamaChat(health.baseUrl, model, msgs);
        const { reply, suggestedActions } = store.parsePjaisAssistantReply(rawReply);
        const suggestedMemory = store.extractSuggestedMemoryFromUserMessage(message);
        const normalizedActions = Array.isArray(suggestedActions)
          ? suggestedActions.filter((a) => a && typeof a === 'object')
          : [];
        return {
          reply,
          suggestedActions: normalizedActions,
          suggestedMemory,
          usedOllama: true,
          model,
        };
      } catch (err) {
        console.error('Ollama chat failed, falling back to offline assistant', err);
        const fallback = await store.chatWithAssistant(payload.workspaceId, message, history);
        return {
          ...fallback,
          suggestedActions: [],
          usedOllama: false,
          ollamaError: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const fallback = await store.chatWithAssistant(payload.workspaceId, message, history);
    if (health.ok && health.modelNames.length === 0) {
      return {
        ...fallback,
        suggestedActions: [],
        usedOllama: false,
        ollamaError:
          'Ollama is running but no models are installed. Run e.g. ollama pull llama3.2 in a terminal.',
      };
    }
    return {
      ...fallback,
      suggestedActions: [],
      usedOllama: false,
      ollamaError: health.error || 'Cannot reach Ollama. Start Ollama or check OLLAMA_HOST.',
    };
  });

  ipcMain.handle('ai:suggestMemory', async (_event, payload) => {
    if (!payload || typeof payload.message !== 'string') {
      throw new Error('message is required');
    }
    const draft = store.suggestMemoryFromMessage(payload.message);
    return { draft };
  });
}
