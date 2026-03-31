import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { memoryFormSchema, type MemoryFormValues } from '../../lib/schemas';
import { MEMORY_TYPES } from '../../lib/constants';

export const WorkspaceMemories: React.FC = () => {
  const { workspaceId } = useParams<'workspaceId'>();
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSemantic, setSearchSemantic] = useState(false);
  const [searchResults, setSearchResults] = useState<WorkspaceSearchResult | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!workspaceId) return;
    window.pjais
      .listMemories(workspaceId)
      .then(setMemories)
      .catch((e) => console.error('Failed to load memories', e));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await window.pjais.searchWorkspace(workspaceId, q, { semantic: searchSemantic });
      setSearchResults(res);
    } catch (err) {
      console.error(err);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemoryFormValues>({
    resolver: zodResolver(memoryFormSchema),
    defaultValues: { type: 'decision', description: '' },
  });

  const onCreate = async (values: MemoryFormValues) => {
    if (!workspaceId) return;
    try {
      const created = await window.pjais.createMemory({
        workspaceId,
        type: values.type,
        description: values.description.trim(),
        sourceKind: 'manual',
      });
      setMemories((prev) => [created, ...prev]);
      reset({ type: 'decision', description: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!workspaceId) return;
    if (!window.confirm('Delete this memory?')) return;
    try {
      await window.pjais.deleteMemory(workspaceId, id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
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
          Business <span className="text-brand-blue">memories</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          Structured facts the AI can use. Search matches text and note bodies; optional semantic
          merge uses embeddings when Ollama is available.
        </p>
      </header>

      <form onSubmit={handleSearch} className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[200px] flex-1">
          <label className="label" htmlFor="memory-search">
            Search memories & vault
          </label>
          <input
            id="memory-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base"
            placeholder="Keyword…"
            aria-label="Search workspace memories and documents"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400 pb-1">
          <input
            type="checkbox"
            checked={searchSemantic}
            onChange={(e) => setSearchSemantic(e.target.checked)}
            className="rounded border-surface-600"
          />
          Semantic memories
        </label>
        <button type="submit" className="btn-primary">
          Search
        </button>
        <button
          type="button"
          className="rounded-lg border border-surface-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-surface-800"
          onClick={() => {
            setSearchQuery('');
            setSearchResults(null);
          }}
        >
          Clear
        </button>
      </form>

      {searchResults && (
        <section className="card p-5 space-y-4" aria-label="Search results">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Results</h2>
          {searchResults.semanticError && (
            <p className="text-xs text-amber-200/90">{searchResults.semanticError}</p>
          )}
          {searchResults.semanticMemories && searchResults.semanticMemories.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-2">Semantic matches</h3>
              <ul className="space-y-2 text-sm">
                {searchResults.semanticMemories.map((row) => (
                  <li
                    key={row.memory.id}
                    className="rounded-lg border border-brand-blue/30 px-3 py-2"
                  >
                    <span className="text-[10px] uppercase text-slate-500">
                      score {(row.score * 100).toFixed(0)}%
                    </span>
                    <p className="text-xs uppercase text-brand-yellow">{row.memory.type}</p>
                    <p className="text-slate-200">{row.memory.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-2">Memories</h3>
            {searchResults.memories.length === 0 ? (
              <p className="text-sm text-slate-500">No matches.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {searchResults.memories.map((m) => (
                  <li key={m.id} className="rounded-lg border border-surface-700/50 px-3 py-2">
                    <span className="text-xs uppercase text-brand-yellow">{m.type}</span>
                    <p className="text-slate-200">{m.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-2">Vault documents</h3>
            {searchResults.documents.length === 0 ? (
              <p className="text-sm text-slate-500">No matches.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {searchResults.documents.map((d) => (
                  <li key={d.id} className="rounded-lg border border-surface-700/50 px-3 py-2">
                    <p className="font-medium text-slate-200">{d.title}</p>
                    <p className="text-xs font-mono text-slate-500">{d.path}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Add memory
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit(onCreate)}>
            <div>
              <label className="label" htmlFor="mem-type">
                Type
              </label>
              <select id="mem-type" className="input-base" {...register('type')}>
                {MEMORY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="mem-desc">
                Description
              </label>
              <textarea
                id="mem-desc"
                rows={4}
                className="input-base resize-y"
                {...register('description')}
                aria-invalid={errors.description ? 'true' : 'false'}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save memory'}
            </button>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Saved memories
          </h2>
          <ul className="space-y-3 text-sm">
            {memories.length === 0 && (
              <li className="text-slate-500">No memories yet.</li>
            )}
            {memories.map((m) =>
              editingId === m.id ? (
                <MemoryEditRow
                  key={m.id}
                  memory={m}
                  workspaceId={workspaceId}
                  onSaved={(updated) => {
                    setMemories((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <li
                  key={m.id}
                  className="rounded-lg border border-surface-700/50 bg-surface-950/80 px-4 py-3"
                >
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-yellow">
                        {m.type}
                      </p>
                      <p className="mt-1 text-slate-200 whitespace-pre-wrap">{m.description}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(m.createdAt).toLocaleString()} · {m.sourceKind}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand-blue hover:underline"
                        onClick={() => setEditingId(m.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-400 hover:underline"
                        onClick={() => handleDelete(m.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
        </section>
      </div>
    </div>
  );
};

const MemoryEditRow: React.FC<{
  memory: MemoryRecord;
  workspaceId: string;
  onSaved(m: MemoryRecord): void;
  onCancel(): void;
}> = ({ memory, workspaceId, onSaved, onCancel }) => {
  const [type, setType] = useState(memory.type);
  const [description, setDescription] = useState(memory.description);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setBusy(true);
    try {
      const updated = await window.pjais.updateMemory(workspaceId, memory.id, {
        type,
        description: description.trim(),
      });
      onSaved(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-lg border border-brand-blue/30 bg-surface-950/80 px-4 py-3">
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="label" htmlFor={`et-${memory.id}`}>
            Type
          </label>
          <select
            id={`et-${memory.id}`}
            className="input-base"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={busy}
          >
            {MEMORY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`ed-${memory.id}`}>
            Description
          </label>
          <textarea
            id={`ed-${memory.id}`}
            rows={4}
            className="input-base resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary text-sm py-2" disabled={busy}>
            Save
          </button>
          <button
            type="button"
            className="rounded-lg border border-surface-700 px-3 py-2 text-sm text-slate-300"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
};
