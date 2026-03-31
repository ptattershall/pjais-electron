export const WORKSPACE_NAV_ITEMS: { label: string; path: string }[] = [
  { label: 'Dashboard', path: 'dashboard' },
  { label: 'Phases', path: 'phases' },
  { label: 'Tasks', path: 'tasks' },
  { label: 'Vault', path: 'vault' },
  { label: 'Memories', path: 'memories' },
  { label: 'Maintenance', path: 'maintenance' },
  { label: 'Browser', path: 'browser' },
];

export const TASK_STATUSES: { value: TaskSummary['status']; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
];

export const MEMORY_TYPES: { value: string; label: string }[] = [
  { value: 'brand_voice', label: 'Brand voice' },
  { value: 'offer', label: 'Offer' },
  { value: 'icp', label: 'ICP' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'decision', label: 'Decision' },
  { value: 'policy', label: 'Policy' },
  { value: 'sop', label: 'SOP' },
  { value: 'client', label: 'Client' },
  { value: 'other', label: 'Other' },
];
