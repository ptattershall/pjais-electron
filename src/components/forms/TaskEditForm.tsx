import React, { useEffect, useState } from 'react';
import { TASK_STATUSES } from '../../lib/constants';

export interface TaskEditFormProps {
  task: TaskSummary;
  workspaceId: string;
  onSaved(updated: TaskSummary): void;
  onCancel(): void;
}

const dueTimestampToDateInput = (ts: number | null | undefined): string => {
  if (ts == null || Number.isNaN(ts)) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const dateInputToDueTimestamp = (value: string): number | null => {
  if (!value || value.trim() === '') return null;
  const t = new Date(`${value}T12:00:00`).getTime();
  return Number.isNaN(t) ? null : t;
};

export const TaskEditForm: React.FC<TaskEditFormProps> = ({
  task,
  workspaceId,
  onSaved,
  onCancel,
}) => {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskSummary['status']>(task.status);
  const [description, setDescription] = useState(task.description ?? '');
  const [owner, setOwner] = useState(task.owner ?? '');
  const [dueDate, setDueDate] = useState(dueTimestampToDateInput(task.dueDate ?? undefined));
  const [phaseId, setPhaseId] = useState(task.phaseId ?? '');
  const [completionNotes, setCompletionNotes] = useState(task.completionNotes ?? '');
  const [evidenceDocumentId, setEvidenceDocumentId] = useState(task.evidenceDocumentId ?? '');
  const [phases, setPhases] = useState<PhaseSummary[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.pjais
      .listPhases(workspaceId)
      .then(setPhases)
      .catch((e) => console.error('Failed to load phases', e));
    window.pjais
      .listVaultItems(workspaceId)
      .then(setVaultItems)
      .catch((e) => console.error('Failed to load vault', e));
  }, [workspaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const updated = await window.pjais.updateTask(workspaceId, task.id, {
        title: trimmed,
        status,
        description: description.trim() === '' ? null : description,
        owner: owner.trim() === '' ? null : owner,
        dueDate: dateInputToDueTimestamp(dueDate),
        phaseId: phaseId === '' ? null : phaseId,
        completionNotes: completionNotes.trim() === '' ? null : completionNotes,
        evidenceDocumentId: evidenceDocumentId === '' ? null : evidenceDocumentId,
      });
      onSaved(updated);
    } catch (err) {
      console.error('Failed to update task', err);
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label" htmlFor={`edit-title-${task.id}`}>
          Title
        </label>
        <input
          id={`edit-title-${task.id}`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-base"
          disabled={isSubmitting}
          autoFocus
          aria-describedby={error ? `edit-error-${task.id}` : undefined}
        />
      </div>
      <div>
        <label className="label" htmlFor={`edit-status-${task.id}`}>
          Status
        </label>
        <select
          id={`edit-status-${task.id}`}
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskSummary['status'])}
          className="input-base"
          disabled={isSubmitting}
        >
          {TASK_STATUSES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`edit-phase-${task.id}`}>
          Phase
        </label>
        <select
          id={`edit-phase-${task.id}`}
          value={phaseId}
          onChange={(e) => setPhaseId(e.target.value)}
          className="input-base"
          disabled={isSubmitting}
        >
          <option value="">No phase</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`edit-desc-${task.id}`}>
          Description
        </label>
        <textarea
          id={`edit-desc-${task.id}`}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-base resize-y min-h-[4rem]"
          disabled={isSubmitting}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`edit-owner-${task.id}`}>
            Owner
          </label>
          <input
            id={`edit-owner-${task.id}`}
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="input-base"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="label" htmlFor={`edit-due-${task.id}`}>
            Due date
          </label>
          <input
            id={`edit-due-${task.id}`}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input-base"
            disabled={isSubmitting}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`edit-notes-${task.id}`}>
          Completion notes
        </label>
        <textarea
          id={`edit-notes-${task.id}`}
          rows={2}
          value={completionNotes}
          onChange={(e) => setCompletionNotes(e.target.value)}
          className="input-base resize-y"
          disabled={isSubmitting}
          placeholder="Notes when marking complete"
        />
      </div>
      <div>
        <label className="label" htmlFor={`edit-evidence-${task.id}`}>
          Evidence (vault document)
        </label>
        <select
          id={`edit-evidence-${task.id}`}
          value={evidenceDocumentId}
          onChange={(e) => setEvidenceDocumentId(e.target.value)}
          className="input-base"
          disabled={isSubmitting}
        >
          <option value="">None</option>
          {vaultItems.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p id={`edit-error-${task.id}`} className="text-xs font-medium text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-surface-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950 disabled:opacity-60"
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
