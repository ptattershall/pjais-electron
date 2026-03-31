import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vaultNoteSchema, type VaultNoteFormValues } from '../../lib/schemas';

export const WorkspaceVault: React.FC = () => {
  const { workspaceId } = useParams<'workspaceId'>();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!workspaceId) return;
    window.pjais
      .listVaultItems(workspaceId)
      .then(setItems)
      .catch((err) => {
        console.error('Failed to load vault items', err);
        setError('Could not load vault.');
      });
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VaultNoteFormValues>({
    resolver: zodResolver(vaultNoteSchema),
    defaultValues: { title: '', body: '' },
  });

  const onCreateNote = async (values: VaultNoteFormValues) => {
    if (!workspaceId) return;
    setError(null);
    try {
      const created = await window.pjais.createVaultNote(workspaceId, {
        title: values.title.trim(),
        body: values.body?.trim() ?? '',
      });
      setItems((prev) => [...prev, created]);
      reset({ title: '', body: '' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not save note.');
    }
  };

  const handleImport = async () => {
    if (!workspaceId) return;
    setError(null);
    setImporting(true);
    try {
      const created = await window.pjais.importVaultFile(workspaceId);
      if (created) {
        setItems((prev) => [...prev, created]);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">
            Document <span className="text-brand-yellow">vault</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Notes are saved as Markdown under <code className="text-xs">vault/notes/</code>. Files
            are copied into the vault folder; metadata lives in SQLite for AI context.
          </p>
        </div>
        <button
          type="button"
          onClick={handleImport}
          disabled={importing}
          className="btn-primary"
          aria-busy={importing}
        >
          {importing ? 'Importing…' : 'Import file'}
        </button>
      </header>
      {error && (
        <p className="text-sm font-medium text-red-400" role="alert">
          {error}
        </p>
      )}

      <section className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">New note</h2>
        <form className="space-y-4 max-w-xl" onSubmit={handleSubmit(onCreateNote)}>
          <div>
            <label className="label" htmlFor="vault-note-title">
              Title
            </label>
            <input
              id="vault-note-title"
              type="text"
              className="input-base"
              {...register('title')}
              aria-invalid={errors.title ? 'true' : 'false'}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="vault-note-body">
              Body
            </label>
            <textarea
              id="vault-note-body"
              rows={6}
              className="input-base resize-y min-h-[120px]"
              placeholder="Markdown supported…"
              {...register('body')}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save note'}
          </button>
        </form>
      </section>

      <section className="card p-5">
        <ul className="space-y-2 text-sm">
          {items.length === 0 && (
            <li className="rounded-lg bg-surface-800/50 px-4 py-4 text-slate-500">
              No documents yet. Add a note above or import a file.
            </li>
          )}
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-surface-700/50 bg-surface-950/80 px-4 py-3 transition-colors hover:border-brand-yellow/20"
            >
              <div>
                <p className="font-semibold text-slate-200">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500 font-mono">{item.path}</p>
                <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-600">{item.type}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
