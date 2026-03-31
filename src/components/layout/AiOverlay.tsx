import React, { useEffect, useRef, useState } from 'react';
import { MEMORY_TYPES } from '../../lib/constants';
import { useAssistantActions } from './AssistantActionsContext';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export interface AiOverlayProps {
  workspaceId?: string;
}

type SuggestedAction = Record<string, unknown> & {
  type?: string;
  section?: string;
  title?: string;
  description?: string;
};

export const AiOverlay: React.FC<AiOverlayProps> = ({ workspaceId }) => {
  const assistant = useAssistantActions();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingMemory, setPendingMemory] = useState<{
    type: string;
    description: string;
    sourceKind: string;
  } | null>(null);
  const [memoryTypeDraft, setMemoryTypeDraft] = useState('');
  const [memoryDescriptionDraft, setMemoryDescriptionDraft] = useState('');
  const [aiHealth, setAiHealth] = useState<AiHealthResult | null>(null);
  const [lastChatMeta, setLastChatMeta] = useState<{
    usedOllama?: boolean;
    model?: string;
    ollamaError?: string;
  } | null>(null);
  const [lastSuggestedActions, setLastSuggestedActions] = useState<SuggestedAction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSemantic, setSearchSemantic] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchResults, setSearchResults] = useState<WorkspaceSearchResult | null>(null);
  const [modelPref, setModelPref] = useState<string>('');
  const endRef = useRef<HTMLDivElement>(null);

  const refreshHealth = async () => {
    try {
      const h = await window.pjais.checkAiHealth();
      setAiHealth(h);
    } catch {
      setAiHealth({
        ok: false,
        baseUrl: '',
        modelNames: [],
        error: 'Could not check Ollama status',
      });
    }
  };

  useEffect(() => {
    void refreshHealth();
    const id = window.setInterval(() => void refreshHealth(), 45000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!workspaceId) {
      setModelPref('');
      return;
    }
    window.pjais
      .getOllamaModelSetting(workspaceId)
      .then((m) => setModelPref(m || ''))
      .catch(() => setModelPref(''));
  }, [workspaceId]);

  useEffect(() => {
    setMessages([]);
    setPendingMemory(null);
    setMemoryTypeDraft('');
    setMemoryDescriptionDraft('');
    setInput('');
    setLastChatMeta(null);
    setLastSuggestedActions([]);
    setSearchQuery('');
    setSearchResults(null);
  }, [workspaceId]);

  useEffect(() => {
    if (pendingMemory) {
      setMemoryTypeDraft(pendingMemory.type);
      setMemoryDescriptionDraft(pendingMemory.description);
    } else {
      setMemoryTypeDraft('');
      setMemoryDescriptionDraft('');
    }
  }, [pendingMemory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingMemory, lastSuggestedActions, searchResults]);

  const ollamaReady = Boolean(aiHealth?.ok && aiHealth.modelNames.length > 0);
  const degradedReason = !aiHealth
    ? null
    : !aiHealth.ok
      ? aiHealth.error || 'Cannot reach Ollama'
      : aiHealth.modelNames.length === 0
        ? 'No models installed in Ollama'
        : null;

  const persistModelPref = async (value: string) => {
    if (!workspaceId) return;
    setModelPref(value);
    try {
      await window.pjais.setOllamaModelSetting(workspaceId, value);
    } catch (e) {
      console.error(e);
    }
  };

  const runWorkspaceSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearchBusy(true);
    try {
      const res = await window.pjais.searchWorkspace(workspaceId, q, { semantic: searchSemantic });
      setSearchResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchBusy(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !workspaceId || busy) return;
    setInput('');
    setBusy(true);
    setPendingMemory(null);
    setLastSuggestedActions([]);
    const historyBefore = messages;
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    try {
      const result = await window.pjais.chatWithAssistant(workspaceId, text, historyBefore);
      setLastChatMeta({
        usedOllama: result.usedOllama,
        model: result.model,
        ollamaError: result.ollamaError,
      });
      let reply = result.reply;
      if (result.ollamaError && !result.usedOllama) {
        reply = `${reply}\n\n— _Offline mode: ${result.ollamaError}_`;
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      if (result.suggestedMemory) {
        setPendingMemory(result.suggestedMemory);
      }
      if (Array.isArray(result.suggestedActions) && result.suggestedActions.length > 0) {
        setLastSuggestedActions(result.suggestedActions as SuggestedAction[]);
      }
      void refreshHealth();
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. Try again.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const approvePendingMemory = async () => {
    if (!workspaceId || !pendingMemory) return;
    const type = memoryTypeDraft.trim();
    const description = memoryDescriptionDraft.trim();
    if (!type || !description) return;
    setBusy(true);
    try {
      await window.pjais.createMemory({
        workspaceId,
        type,
        description,
        sourceKind: pendingMemory.sourceKind || 'chat',
      });
      setPendingMemory(null);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Memory saved to this workspace.',
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const draftFromLastMessage = async () => {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    if (!last) return;
    try {
      const { draft } = await window.pjais.suggestMemoryFromMessage(last.content);
      if (draft) {
        setPendingMemory(draft);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const applyNavigateAction = (section: string) => {
    assistant?.applyNavigate(section);
    setLastSuggestedActions([]);
  };

  const applyCreateTaskAction = async (title: string, description?: string) => {
    if (!window.confirm(`Create task "${title}"?`)) return;
    try {
      await assistant?.applyCreateTask(title, description);
      setLastSuggestedActions([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section
      className="flex h-full w-96 flex-col border-l border-surface-700/50 bg-surface-900/95 backdrop-blur-sm shadow-glow-blue"
      aria-label="AI assistant panel"
    >
      <header className="flex flex-col gap-2 border-b border-surface-700/50 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-brand-blue">PJais Copilot</h2>
            <p className="mt-0.5 text-xs text-slate-400 font-medium">
              {!workspaceId
                ? 'Open a workspace to chat'
                : ollamaReady
                  ? lastChatMeta?.usedOllama && lastChatMeta.model
                    ? `Ollama · ${lastChatMeta.model}`
                    : 'Workspace context · Ollama ready'
                  : 'Workspace context · offline assistant'}
            </p>
          </div>
        </div>
        {workspaceId && ollamaReady && aiHealth && (
          <div className="space-y-1">
            <label htmlFor="copilot-model" className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Model for this workspace
            </label>
            <select
              id="copilot-model"
              className="input-base w-full py-1.5 text-xs"
              value={modelPref || ''}
              onChange={(e) => void persistModelPref(e.target.value)}
              aria-label="Preferred Ollama model"
            >
              <option value="">Auto (first available)</option>
              {aiHealth.modelNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500">
              Chat and embeddings use this model when set. Override with{' '}
              <kbd className="rounded bg-surface-800 px-1 font-mono">PJAIS_OLLAMA_MODEL</kbd>.
            </p>
          </div>
        )}
        {workspaceId && degradedReason && (
          <div
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-100/95"
            role="status"
            aria-live="polite"
          >
            <span className="font-semibold text-amber-200">Assistant degraded: </span>
            {degradedReason}. Core workspace features still work; install or start Ollama for full
            LLM replies.
          </div>
        )}
        {workspaceId && (
          <form onSubmit={runWorkspaceSearch} className="space-y-2 border-t border-surface-700/40 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Search workspace
            </p>
            <div className="flex gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-base min-w-0 flex-1 py-1.5 text-xs"
                placeholder="Keywords…"
                aria-label="Search memories and vault"
              />
              <button type="submit" className="btn-primary px-2 py-1.5 text-xs shrink-0" disabled={searchBusy}>
                {searchBusy ? '…' : 'Go'}
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
              <input
                type="checkbox"
                checked={searchSemantic}
                onChange={(e) => setSearchSemantic(e.target.checked)}
                disabled={!ollamaReady}
                className="rounded border-surface-600"
              />
              Include semantic memory match (needs Ollama + embedding-capable model)
            </label>
            {searchResults && (
              <div className="max-h-32 overflow-auto rounded border border-surface-700/50 bg-surface-950/80 p-2 text-[11px] text-slate-400">
                <p className="font-semibold text-slate-300">
                  {searchResults.memories.length} memories · {searchResults.documents.length} docs
                </p>
                {'semanticError' in searchResults && searchResults.semanticError && (
                  <p className="text-amber-200/90 mt-1">{String(searchResults.semanticError)}</p>
                )}
              </div>
            )}
          </form>
        )}
      </header>
      <div className="flex-1 overflow-auto px-4 py-4 text-sm text-slate-300 leading-relaxed space-y-3">
        {!workspaceId && (
          <p className="text-slate-500">
            Select a workspace from the sidebar to enable workspace-aware replies.
          </p>
        )}
        {workspaceId && messages.length === 0 && (
          <p className="text-slate-500">
            Ask about this workspace or type{' '}
            <kbd className="rounded bg-surface-800 px-1.5 py-0.5 font-mono text-xs">
              remember: …
            </kbd>{' '}
            to draft a memory for approval.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`rounded-lg px-3 py-2 whitespace-pre-wrap ${
              m.role === 'user'
                ? 'ml-4 bg-brand-blue/15 text-slate-100'
                : 'mr-4 bg-surface-800/80 text-slate-300'
            }`}
          >
            {m.content}
          </div>
        ))}
        {lastSuggestedActions.length > 0 && (
          <div
            className="rounded-lg border border-brand-blue/35 bg-surface-950/90 p-3"
            role="region"
            aria-label="Suggested actions from assistant"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue mb-2">
              Suggested actions
            </p>
            <ul className="flex flex-col gap-2">
              {lastSuggestedActions.map((a, idx) => {
                const t = typeof a.type === 'string' ? a.type : '';
                if (t === 'navigate' && typeof a.section === 'string') {
                  return (
                    <li key={idx}>
                      <button
                        type="button"
                        className="w-full rounded-md bg-brand-blue/20 px-3 py-2 text-left text-xs font-semibold text-brand-blue hover:bg-brand-blue/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                        onClick={() => applyNavigateAction(a.section as string)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            applyNavigateAction(a.section as string);
                          }
                        }}
                      >
                        Open {a.section}
                      </button>
                    </li>
                  );
                }
                if (t === 'createTask' && typeof a.title === 'string' && a.title.trim()) {
                  return (
                    <li key={idx}>
                      <button
                        type="button"
                        className="w-full rounded-md bg-brand-yellow/15 px-3 py-2 text-left text-xs font-semibold text-brand-yellow hover:bg-brand-yellow/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
                        onClick={() =>
                          void applyCreateTaskAction(
                            a.title as string,
                            typeof a.description === 'string' ? a.description : undefined,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            void applyCreateTaskAction(
                              a.title as string,
                              typeof a.description === 'string' ? a.description : undefined,
                            );
                          }
                        }}
                      >
                        Create task: {a.title}
                      </button>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
            <button
              type="button"
              className="mt-2 text-[10px] font-semibold text-slate-500 hover:text-slate-300"
              onClick={() => setLastSuggestedActions([])}
            >
              Dismiss suggestions
            </button>
          </div>
        )}
        {pendingMemory && (
          <div
            className="rounded-lg border border-brand-yellow/40 bg-surface-950/90 p-3"
            role="region"
            aria-label="Suggested memory"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-brand-yellow mb-3">
              Review memory
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="memory-type-draft" className="mb-1 block text-xs font-medium text-slate-500">
                  Type
                </label>
                <input
                  id="memory-type-draft"
                  type="text"
                  value={memoryTypeDraft}
                  onChange={(e) => setMemoryTypeDraft(e.target.value)}
                  list="memory-type-suggestions"
                  className="input-base w-full text-sm py-2"
                  aria-label="Memory type"
                  disabled={busy}
                />
                <datalist id="memory-type-suggestions">
                  {MEMORY_TYPES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </datalist>
              </div>
              <div>
                <label
                  htmlFor="memory-description-draft"
                  className="mb-1 block text-xs font-medium text-slate-500"
                >
                  Description
                </label>
                <textarea
                  id="memory-description-draft"
                  value={memoryDescriptionDraft}
                  onChange={(e) => setMemoryDescriptionDraft(e.target.value)}
                  rows={4}
                  className="input-base w-full resize-y text-sm min-h-[88px]"
                  aria-label="Memory description"
                  disabled={busy}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-brand-yellow/90 px-3 py-1.5 text-xs font-bold text-surface-950 hover:bg-brand-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
                onClick={approvePendingMemory}
                disabled={busy || !memoryTypeDraft.trim() || !memoryDescriptionDraft.trim()}
              >
                Approve & save
              </button>
              <button
                type="button"
                className="rounded-md border border-surface-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-surface-800"
                onClick={() => setPendingMemory(null)}
                disabled={busy}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {workspaceId && (
        <footer className="border-t border-surface-700/50 p-3 space-y-2">
          <button
            type="button"
            className="text-xs font-semibold text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded"
            onClick={draftFromLastMessage}
            disabled={busy || messages.length === 0}
          >
            Extract memory draft from last user message
          </button>
          <form onSubmit={send} className="flex gap-2">
            <label htmlFor="copilot-input" className="sr-only">
              Message to assistant
            </label>
            <input
              id="copilot-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input-base flex-1 text-sm py-2"
              placeholder="Message…"
              disabled={busy}
              autoComplete="off"
            />
            <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={busy}>
              {busy ? '…' : 'Send'}
            </button>
          </form>
        </footer>
      )}
    </section>
  );
};
