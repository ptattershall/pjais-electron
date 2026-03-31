const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pjais', {
  async listWorkspaces() {
    return ipcRenderer.invoke('workspace:list');
  },
  async createWorkspace(input) {
    return ipcRenderer.invoke('workspace:create', input);
  },
  async listPhases(workspaceId) {
    return ipcRenderer.invoke('phase:list', { workspaceId });
  },
  async listTasks(workspaceId) {
    return ipcRenderer.invoke('task:list', { workspaceId });
  },
  async createTask(input) {
    return ipcRenderer.invoke('task:create', input);
  },
  async updateTask(workspaceId, taskId, updates) {
    return ipcRenderer.invoke('task:update', { workspaceId, taskId, ...updates });
  },
  async listVaultItems(workspaceId) {
    return ipcRenderer.invoke('vault:list', { workspaceId });
  },
  async createVaultNote(workspaceId, input) {
    return ipcRenderer.invoke('vault:createNote', { workspaceId, ...input });
  },
  async importVaultFile(workspaceId) {
    return ipcRenderer.invoke('vault:importFile', { workspaceId });
  },
  async listMemories(workspaceId) {
    return ipcRenderer.invoke('memory:list', { workspaceId });
  },
  async createMemory(input) {
    return ipcRenderer.invoke('memory:create', input);
  },
  async updateMemory(workspaceId, memoryId, updates) {
    return ipcRenderer.invoke('memory:update', { workspaceId, memoryId, ...updates });
  },
  async deleteMemory(workspaceId, memoryId) {
    return ipcRenderer.invoke('memory:delete', { workspaceId, memoryId });
  },
  async searchWorkspace(workspaceId, query, options) {
    return ipcRenderer.invoke('workspace:search', {
      workspaceId,
      query,
      semantic: Boolean(options?.semantic),
    });
  },
  async getWeeklyReview(workspaceId) {
    return ipcRenderer.invoke('maintenance:getWeeklyReview', { workspaceId });
  },
  async saveWeeklyReview(workspaceId, state) {
    return ipcRenderer.invoke('maintenance:saveWeeklyReview', { workspaceId, state });
  },
  async getOllamaModelSetting(workspaceId) {
    return ipcRenderer.invoke('settings:getOllamaModel', { workspaceId });
  },
  async setOllamaModelSetting(workspaceId, model) {
    return ipcRenderer.invoke('settings:setOllamaModel', { workspaceId, model });
  },
  async browserShow(url) {
    return ipcRenderer.invoke('browser:show', { url });
  },
  async browserHide() {
    return ipcRenderer.invoke('browser:hide');
  },
  async browserSetBounds(rect) {
    return ipcRenderer.invoke('browser:setBounds', rect);
  },
  async browserLoadURL(url) {
    return ipcRenderer.invoke('browser:loadURL', url);
  },
  async chatWithAssistant(workspaceId, message, history) {
    return ipcRenderer.invoke('ai:chat', { workspaceId, message, history });
  },
  async suggestMemoryFromMessage(message) {
    return ipcRenderer.invoke('ai:suggestMemory', { message });
  },
  async checkAiHealth() {
    return ipcRenderer.invoke('ai:health');
  },
});
