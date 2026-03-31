import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, type CreateTaskFormValues } from '../../lib/schemas';

export interface CreateTaskFormProps {
  workspaceId: string;
  onCreated(task: TaskSummary): void;
}

const dateInputToDueTimestamp = (value: string | undefined): number | undefined => {
  if (!value || value.trim() === '') return undefined;
  const t = new Date(`${value}T12:00:00`).getTime();
  return Number.isNaN(t) ? undefined : t;
};

export const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ workspaceId, onCreated }) => {
  const [phases, setPhases] = useState<PhaseSummary[]>([]);

  useEffect(() => {
    window.pjais
      .listPhases(workspaceId)
      .then(setPhases)
      .catch((error) => {
        console.error('Failed to load phases', error);
      });
  }, [workspaceId]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      phaseId: '',
      description: '',
      owner: '',
      dueDate: '',
    },
  });

  const onSubmit = async (values: CreateTaskFormValues) => {
    try {
      const created = await window.pjais.createTask({
        workspaceId,
        title: values.title,
        phaseId: values.phaseId && values.phaseId !== '' ? values.phaseId : undefined,
        description: values.description?.trim() || undefined,
        owner: values.owner?.trim() || undefined,
        dueDate: dateInputToDueTimestamp(values.dueDate),
      });
      onCreated(created);
      reset({
        title: '',
        phaseId: '',
        description: '',
        owner: '',
        dueDate: '',
      });
    } catch (error) {
      console.error('Failed to create task', error);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label className="label" htmlFor="task-title">
          Title
        </label>
        <input
          id="task-title"
          type="text"
          className="input-base"
          autoComplete="off"
          aria-invalid={errors.title ? 'true' : 'false'}
          aria-describedby={errors.title ? 'task-title-error' : undefined}
          {...register('title')}
        />
        {errors.title && (
          <p id="task-title-error" className="mt-1 text-xs font-medium text-red-400" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="task-phase">
          Phase
        </label>
        <select id="task-phase" className="input-base" {...register('phaseId')}>
          <option value="">No phase</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="task-description">
          Description
        </label>
        <textarea
          id="task-description"
          rows={3}
          className="input-base resize-y min-h-[4rem]"
          {...register('description')}
        />
      </div>
      <div>
        <label className="label" htmlFor="task-owner">
          Owner
        </label>
        <input id="task-owner" type="text" className="input-base" {...register('owner')} />
      </div>
      <div>
        <label className="label" htmlFor="task-due">
          Due date
        </label>
        <input id="task-due" type="date" className="input-base" {...register('dueDate')} />
      </div>
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create task'}
      </button>
    </form>
  );
};
