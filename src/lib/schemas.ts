import { z } from 'zod';

export const workspaceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  phaseId: z.string().optional(),
  description: z.string().optional(),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
});

export type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

export const memoryFormSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  description: z.string().min(1, 'Description is required'),
});

export type MemoryFormValues = z.infer<typeof memoryFormSchema>;

export const vaultNoteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
});

export type VaultNoteFormValues = z.infer<typeof vaultNoteSchema>;
