import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workspaceSchema, type WorkspaceFormValues } from '../../lib/schemas';

export interface CreateWorkspaceFormProps {
  onCreated(workspace: WorkspaceSummary): void;
}

export const CreateWorkspaceForm: React.FC<CreateWorkspaceFormProps> = ({ onCreated }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
  });

  const onSubmit = async (values: WorkspaceFormValues) => {
    try {
      const created = await window.pjais.createWorkspace(values);
      onCreated(created);
      reset();
    } catch (error) {
      console.error('Failed to create workspace', error);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label className="label" htmlFor="workspace-name">
          Name
        </label>
        <input
          id="workspace-name"
          type="text"
          className="input-base"
          {...register('name')}
        />
        {errors.name && (
          <p className="mt-1.5 text-xs font-medium text-red-400">{errors.name.message}</p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="workspace-description">
          Description
        </label>
        <textarea
          id="workspace-description"
          className="input-base min-h-[80px] resize-y"
          rows={3}
          {...register('description')}
        />
      </div>
      <button
        type="submit"
        className="btn-accent w-full sm:w-auto"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating…' : 'Create workspace'}
      </button>
    </form>
  );
};
