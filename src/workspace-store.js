const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

let SQL = null;

async function getSql() {
  if (!SQL) {
    const initSqlJs = require('sql.js');
    const wasmDir = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist');
    SQL = await initSqlJs({
      locateFile: (file) => path.join(wasmDir, file),
    });
  }
  return SQL;
}

function getBaseDir() {
  if (process.env.PJAIS_TEST_HOME) {
    return path.join(process.env.PJAIS_TEST_HOME, 'PJais');
  }
  return path.join(os.homedir(), 'PJais');
}

function getGlobalDbPath() {
  return path.join(getBaseDir(), 'app.db');
}

function getWorkspaceDir(workspaceId) {
  return path.join(getBaseDir(), 'workspaces', workspaceId);
}

function getWorkspaceDbPath(workspaceId) {
  return path.join(getWorkspaceDir(workspaceId), 'app.db');
}

const GLOBAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

const WORKSPACE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS phases (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    template_key TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    phase_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    owner TEXT,
    due_date INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (phase_id) REFERENCES phases(id)
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    source_reference TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    workspace_id TEXT,
    key TEXT NOT NULL,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    dims INTEGER NOT NULL,
    vector_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (workspace_id, entity_type, entity_id)
  );
`;

/** Default lifecycle phases (aligned with product overview). */
const DEFAULT_PHASE_TEMPLATES = [
  { name: 'Idea → Offer', templateKey: 'idea_offer' },
  { name: 'Brand & Messaging', templateKey: 'brand_messaging' },
  { name: 'Operations Setup', templateKey: 'operations' },
  { name: 'Build & Launch', templateKey: 'build_launch' },
  { name: 'Sales System', templateKey: 'sales' },
  { name: 'Marketing System', templateKey: 'marketing' },
  { name: 'Finance & Admin', templateKey: 'finance_admin' },
  { name: 'Maintenance', templateKey: 'maintenance' },
];

/** Starter action items per phase template (seeded when a workspace has no tasks yet). */
const DEFAULT_TASKS_BY_TEMPLATE = {
  idea_offer: [
    'Define the problem you solve in one paragraph',
    'Draft your core offer (what, for whom, outcome)',
    'List three assumptions to validate this week',
    'Talk to three potential customers and capture notes',
  ],
  brand_messaging: [
    'Write a one-line positioning statement',
    'Define tone-of-voice guidelines (do / don’t)',
    'Collect 10 brand keywords and phrases',
    'Align website hero with your positioning',
  ],
  operations: [
    'Choose stack for email, calendar, and files',
    'Document where records and passwords live',
    'Set up basic invoicing or payment flow',
    'Define your weekly operating rhythm',
  ],
  build_launch: [
    'Ship a minimal version users can try',
    'Write a short launch checklist',
    'Prepare support / FAQ for day one',
    'Schedule a launch date and owner',
  ],
  sales: [
    'Define your sales stages (lead → closed)',
    'Create a simple proposal or quote template',
    'List top objections and responses',
    'Set a weekly pipeline review habit',
  ],
  marketing: [
    'Pick one primary acquisition channel to test',
    'Draft a 4-week content or campaign plan',
    'Set up basic analytics or UTM discipline',
    'Define one measurable marketing KPI',
  ],
  finance_admin: [
    'Separate business vs personal accounts',
    'Choose bookkeeping cadence (weekly / monthly)',
    'List recurring subscriptions and costs',
    'Set aside tax or reserves per your jurisdiction',
  ],
  maintenance: [
    'Schedule a weekly business review',
    'Review KPIs and adjust targets',
    'Refresh SOPs that are drifting',
    'Capture lessons learned in Memories',
  ],
};

function ensureBaseDir() {
  const base = getBaseDir();
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
}

function tableHasColumn(db, tableName, columnName) {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  let found = false;
  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.name === columnName) {
      found = true;
      break;
    }
  }
  stmt.free();
  return found;
}

function migrateWorkspaceDb(db) {
  if (!tableHasColumn(db, 'tasks', 'completion_notes')) {
    db.run('ALTER TABLE tasks ADD COLUMN completion_notes TEXT');
  }
  if (!tableHasColumn(db, 'tasks', 'evidence_document_id')) {
    db.run('ALTER TABLE tasks ADD COLUMN evidence_document_id TEXT');
  }
  db.run(`CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    dims INTEGER NOT NULL,
    vector_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (workspace_id, entity_type, entity_id)
  )`);
}

function seedPhasesIfEmpty(db, workspaceId) {
  const countStmt = db.prepare(
    'SELECT COUNT(*) AS c FROM phases WHERE workspace_id = ?',
  );
  countStmt.bind([workspaceId]);
  countStmt.step();
  const count = countStmt.getAsObject().c;
  countStmt.free();
  if (count > 0) {
    return;
  }
  const now = Date.now();
  DEFAULT_PHASE_TEMPLATES.forEach((tpl, index) => {
    const id = createId('phase');
    db.run(
      'INSERT INTO phases (id, workspace_id, name, order_index, template_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, workspaceId, tpl.name, index, tpl.templateKey, now],
    );
  });
}

function seedTemplateTasksIfEmpty(db, workspaceId) {
  const tStmt = db.prepare('SELECT COUNT(*) AS c FROM tasks WHERE workspace_id = ?');
  tStmt.bind([workspaceId]);
  tStmt.step();
  const taskCount = tStmt.getAsObject().c;
  tStmt.free();
  if (taskCount > 0) {
    return;
  }
  const pStmt = db.prepare(
    'SELECT id, template_key AS templateKey FROM phases WHERE workspace_id = ? ORDER BY order_index ASC',
  );
  pStmt.bind([workspaceId]);
  const phases = [];
  while (pStmt.step()) {
    phases.push(pStmt.getAsObject());
  }
  pStmt.free();
  if (phases.length === 0) {
    return;
  }
  const now = Date.now();
  for (const ph of phases) {
    const key = ph.templateKey || ph.template_key;
    const titles = DEFAULT_TASKS_BY_TEMPLATE[key] || [];
    for (const title of titles) {
      const id = createId('task');
      db.run(
        'INSERT INTO tasks (id, workspace_id, phase_id, title, description, status, owner, due_date, completed_at, created_at, completion_notes, evidence_document_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, workspaceId, ph.id, title, null, 'pending', null, null, null, now, null, null],
      );
    }
  }
}

async function withGlobalDb(fn) {
  ensureBaseDir();
  const Sql = await getSql();
  const dbPath = getGlobalDbPath();
  let buffer = null;
  if (fs.existsSync(dbPath)) {
    buffer = fs.readFileSync(dbPath);
  }
  const db = new Sql.Database(buffer);
  db.run(GLOBAL_SCHEMA);
  try {
    const result = await fn(db);
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    return result;
  } finally {
    db.close();
  }
}

async function withWorkspaceDb(workspaceId, fn) {
  const dir = getWorkspaceDir(workspaceId);
  if (!fs.existsSync(dir)) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }
  const Sql = await getSql();
  const dbPath = getWorkspaceDbPath(workspaceId);
  let buffer = null;
  if (fs.existsSync(dbPath)) {
    buffer = fs.readFileSync(dbPath);
  }
  const db = new Sql.Database(buffer);
  db.run(WORKSPACE_SCHEMA);
  migrateWorkspaceDb(db);
  seedPhasesIfEmpty(db, workspaceId);
  seedTemplateTasksIfEmpty(db, workspaceId);
  try {
    const result = await fn(db);
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    return result;
  } finally {
    db.close();
  }
}

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

async function listWorkspaces() {
  return withGlobalDb((db) => {
    const stmt = db.prepare(
      'SELECT id, name, description FROM workspaces ORDER BY created_at ASC',
    );
    const rows = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push({
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
      });
    }
    stmt.free();
    return rows;
  });
}

async function getWorkspaceMeta(workspaceId) {
  return withGlobalDb((db) => {
    const stmt = db.prepare('SELECT id, name, description FROM workspaces WHERE id = ?');
    stmt.bind([workspaceId]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
    };
  });
}

async function createWorkspace(input) {
  const id = createId('ws');
  const now = Date.now();
  ensureBaseDir();
  const dir = getWorkspaceDir(id);
  fs.mkdirSync(dir, { recursive: true });
  const vaultDir = path.join(dir, 'vault');
  fs.mkdirSync(vaultDir, { recursive: true });
  const vectorsDir = path.join(dir, 'vectors');
  fs.mkdirSync(vectorsDir, { recursive: true });
  const storageReadme = path.join(vectorsDir, 'STORAGE.txt');
  if (!fs.existsSync(storageReadme)) {
    fs.writeFileSync(
      storageReadme,
      [
        'PJais vector storage',
        '-------------------',
        'Embeddings are stored in the workspace SQLite database (embeddings table) for portability.',
        'This directory is reserved for optional future LanceDB files or other local vector data.',
        '',
      ].join('\n'),
      'utf8',
    );
  }

  await withGlobalDb((db) => {
    db.run(
      'INSERT INTO workspaces (id, name, slug, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, input.name, null, input.description ?? null, now, now],
    );
    return { id, name: input.name, description: input.description ?? undefined };
  });

  const workspaceDbPath = getWorkspaceDbPath(id);
  const Sql = await getSql();
  const db = new Sql.Database();
  db.run(WORKSPACE_SCHEMA);
  migrateWorkspaceDb(db);
  seedPhasesIfEmpty(db, id);
  seedTemplateTasksIfEmpty(db, id);
  const data = db.export();
  fs.writeFileSync(workspaceDbPath, Buffer.from(data));
  db.close();

  return { id, name: input.name, description: input.description ?? undefined };
}

async function listPhases(workspaceId) {
  return withWorkspaceDb(workspaceId, (db) => {
    const stmt = db.prepare(
      'SELECT id, workspace_id AS workspaceId, name, order_index AS orderIndex, template_key AS templateKey FROM phases WHERE workspace_id = ? ORDER BY order_index ASC',
    );
    stmt.bind([workspaceId]);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  });
}

function mapTaskRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    phaseId: row.phaseId ?? null,
    phaseName: row.phaseName ?? null,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    owner: row.owner ?? null,
    dueDate: row.dueDate != null ? row.dueDate : null,
    completedAt: row.completedAt != null ? row.completedAt : null,
    completionNotes: row.completionNotes ?? null,
    evidenceDocumentId: row.evidenceDocumentId ?? null,
    evidenceTitle: row.evidenceTitle ?? null,
  };
}

async function listTasks(workspaceId) {
  return withWorkspaceDb(workspaceId, (db) => {
    const stmt = db.prepare(
      `SELECT t.id,
        t.workspace_id AS workspaceId,
        t.phase_id AS phaseId,
        p.name AS phaseName,
        t.title,
        t.description,
        t.status,
        t.owner,
        t.due_date AS dueDate,
        t.completed_at AS completedAt,
        t.completion_notes AS completionNotes,
        t.evidence_document_id AS evidenceDocumentId,
        d.title AS evidenceTitle
      FROM tasks t
      LEFT JOIN phases p ON p.id = t.phase_id
      LEFT JOIN documents d ON d.id = t.evidence_document_id
      WHERE t.workspace_id = ?
      ORDER BY t.created_at ASC`,
    );
    stmt.bind([workspaceId]);
    const rows = [];
    while (stmt.step()) {
      rows.push(mapTaskRow(stmt.getAsObject()));
    }
    stmt.free();
    return rows;
  });
}

function validatePhaseInWorkspace(db, workspaceId, phaseId) {
  if (!phaseId) return;
  const stmt = db.prepare(
    'SELECT id FROM phases WHERE id = ? AND workspace_id = ? LIMIT 1',
  );
  stmt.bind([phaseId, workspaceId]);
  const ok = stmt.step();
  stmt.free();
  if (!ok) {
    throw new Error('Invalid phase for this workspace');
  }
}

function validateDocumentInWorkspace(db, workspaceId, documentId) {
  if (!documentId) return;
  const stmt = db.prepare(
    'SELECT id FROM documents WHERE id = ? AND workspace_id = ? LIMIT 1',
  );
  stmt.bind([documentId, workspaceId]);
  const ok = stmt.step();
  stmt.free();
  if (!ok) {
    throw new Error('Invalid document for this workspace');
  }
}

async function createTask(input) {
  const id = createId('task');
  const now = Date.now();
  const phaseId = input.phaseId ?? null;
  const description = input.description != null ? String(input.description) : null;
  const owner = input.owner != null && String(input.owner).trim() !== '' ? String(input.owner).trim() : null;
  const dueDate =
    typeof input.dueDate === 'number' && !Number.isNaN(input.dueDate) ? input.dueDate : null;

  return withWorkspaceDb(input.workspaceId, (db) => {
    validatePhaseInWorkspace(db, input.workspaceId, phaseId);
    db.run(
      'INSERT INTO tasks (id, workspace_id, phase_id, title, description, status, owner, due_date, completed_at, created_at, completion_notes, evidence_document_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        input.workspaceId,
        phaseId,
        input.title,
        description,
        'pending',
        owner,
        dueDate,
        null,
        now,
        null,
        null,
      ],
    );
    return listTasksRowById(db, input.workspaceId, id);
  });
}

function listTasksRowById(db, workspaceId, taskId) {
  const stmt = db.prepare(
    `SELECT t.id,
      t.workspace_id AS workspaceId,
      t.phase_id AS phaseId,
      p.name AS phaseName,
      t.title,
      t.description,
      t.status,
      t.owner,
      t.due_date AS dueDate,
      t.completed_at AS completedAt,
      t.completion_notes AS completionNotes,
      t.evidence_document_id AS evidenceDocumentId,
      d.title AS evidenceTitle
    FROM tasks t
    LEFT JOIN phases p ON p.id = t.phase_id
    LEFT JOIN documents d ON d.id = t.evidence_document_id
    WHERE t.id = ? AND t.workspace_id = ?`,
  );
  stmt.bind([taskId, workspaceId]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = mapTaskRow(stmt.getAsObject());
  stmt.free();
  return row;
}

async function updateTask(workspaceId, taskId, updates) {
  return withWorkspaceDb(workspaceId, (db) => {
    const setClauses = [];
    const bindings = [];

    if (updates.title !== undefined) {
      setClauses.push('title = ?');
      bindings.push(String(updates.title).trim());
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      bindings.push(updates.status);
      if (updates.status === 'done') {
        setClauses.push('completed_at = ?');
        bindings.push(Date.now());
      } else {
        setClauses.push('completed_at = ?');
        bindings.push(null);
      }
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      bindings.push(updates.description === null || updates.description === '' ? null : String(updates.description));
    }
    if (updates.owner !== undefined) {
      setClauses.push('owner = ?');
      bindings.push(
        updates.owner === null || String(updates.owner).trim() === ''
          ? null
          : String(updates.owner).trim(),
      );
    }
    if (updates.dueDate !== undefined) {
      setClauses.push('due_date = ?');
      bindings.push(
        updates.dueDate === null || updates.dueDate === undefined
          ? null
          : typeof updates.dueDate === 'number'
            ? updates.dueDate
            : null,
      );
    }
    if (updates.phaseId !== undefined) {
      const pid = updates.phaseId === null || updates.phaseId === '' ? null : updates.phaseId;
      validatePhaseInWorkspace(db, workspaceId, pid);
      setClauses.push('phase_id = ?');
      bindings.push(pid);
    }
    if (updates.completionNotes !== undefined) {
      setClauses.push('completion_notes = ?');
      bindings.push(
        updates.completionNotes === null || updates.completionNotes === ''
          ? null
          : String(updates.completionNotes),
      );
    }
    if (updates.evidenceDocumentId !== undefined) {
      const eid =
        updates.evidenceDocumentId === null || updates.evidenceDocumentId === ''
          ? null
          : updates.evidenceDocumentId;
      validateDocumentInWorkspace(db, workspaceId, eid);
      setClauses.push('evidence_document_id = ?');
      bindings.push(eid);
    }

    if (setClauses.length === 0) {
      throw new Error('No valid updates provided');
    }

    bindings.push(taskId, workspaceId);
    db.run(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ? AND workspace_id = ?`,
      bindings,
    );

    const row = listTasksRowById(db, workspaceId, taskId);
    if (!row) {
      throw new Error('Task not found');
    }
    return row;
  });
}

async function listVaultItems(workspaceId) {
  return withWorkspaceDb(workspaceId, (db) => {
    const stmt = db.prepare(
      'SELECT id, workspace_id AS workspaceId, title, path, type FROM documents WHERE workspace_id = ? ORDER BY created_at ASC',
    );
    stmt.bind([workspaceId]);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  });
}

async function createVaultItem(input) {
  const id = createId('vault');
  const now = Date.now();
  const docType = input.type && ['note', 'file', 'sop', 'strategy'].includes(input.type) ? input.type : 'file';
  return withWorkspaceDb(input.workspaceId, (db) => {
    db.run(
      'INSERT INTO documents (id, workspace_id, title, path, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, input.workspaceId, input.title, input.path, docType, now, now],
    );
    return {
      id,
      workspaceId: input.workspaceId,
      title: input.title,
      path: input.path,
      type: docType,
    };
  });
}

function resolveWorkspaceRelativePath(workspaceId, relPath) {
  if (!relPath || typeof relPath !== 'string') {
    throw new Error('Path is required');
  }
  const normalized = relPath.replace(/\//g, path.sep);
  const base = path.resolve(getWorkspaceDir(workspaceId));
  const full = path.resolve(base, normalized);
  if (!full.startsWith(base)) {
    throw new Error('Invalid path');
  }
  return full;
}

async function createVaultNote(workspaceId, input) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const body = typeof input.body === 'string' ? input.body : '';
  if (!title) {
    throw new Error('Note title is required');
  }
  const vaultRoot = path.join(getWorkspaceDir(workspaceId), 'vault');
  const notesDir = path.join(vaultRoot, 'notes');
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  const slugBase = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'note';
  let fileName = `${slugBase}.md`;
  let absPath = path.join(notesDir, fileName);
  let n = 0;
  while (fs.existsSync(absPath)) {
    n += 1;
    fileName = `${slugBase}-${n}.md`;
    absPath = path.join(notesDir, fileName);
  }
  const fileContent = `# ${title}\n\n${body}`;
  fs.writeFileSync(absPath, fileContent, 'utf8');
  const relPath = path.join('vault', 'notes', fileName).replace(/\\/g, '/');
  return createVaultItem({
    workspaceId,
    title,
    path: relPath,
    type: 'note',
  });
}

async function readVaultDocumentText(workspaceId, relPath, maxChars = 24000) {
  const full = resolveWorkspaceRelativePath(workspaceId, relPath);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    return null;
  }
  const ext = path.extname(full).toLowerCase();
  if (!['.md', '.txt', '.markdown'].includes(ext)) {
    return null;
  }
  const raw = fs.readFileSync(full, 'utf8');
  if (raw.length <= maxChars) {
    return raw;
  }
  return `${raw.slice(0, maxChars)}\n\n…(truncated)`;
}

async function collectNoteExcerptsForPrompt(workspaceId, maxTotalChars = 6000) {
  const items = await listVaultItems(workspaceId);
  const notes = items.filter((d) => d.type === 'note');
  const parts = [];
  let used = 0;
  for (const doc of notes) {
    if (used >= maxTotalChars) break;
    const text = await readVaultDocumentText(
      workspaceId,
      doc.path,
      Math.min(4000, maxTotalChars - used),
    );
    if (!text) continue;
    const header = `\n--- ${doc.title} ---\n`;
    const budget = maxTotalChars - used - header.length;
    if (budget <= 0) break;
    const slice = text.length > budget ? `${text.slice(0, budget)}…` : text;
    parts.push(header + slice);
    used += header.length + slice.length;
  }
  return parts.join('\n');
}

function getSettingValue(db, workspaceId, key) {
  const stmt = db.prepare(
    'SELECT value FROM settings WHERE workspace_id = ? AND key = ? LIMIT 1',
  );
  stmt.bind([workspaceId, key]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject();
  stmt.free();
  return row.value;
}

function setSettingValue(db, workspaceId, key, value) {
  const sid = createId('set');
  db.run('DELETE FROM settings WHERE workspace_id = ? AND key = ?', [workspaceId, key]);
  db.run(
    'INSERT INTO settings (id, scope, workspace_id, key, value) VALUES (?, ?, ?, ?, ?)',
    [sid, 'workspace', workspaceId, key, value],
  );
}

const DEFAULT_WEEKLY_REVIEW = {
  version: 1,
  items: [
    { id: 'wr_outcomes', label: 'Review last week’s goals vs actual outcomes', done: false },
    { id: 'wr_pipeline', label: 'Scan pipeline / leads and note stuck items', done: false },
    { id: 'wr_finance', label: 'Check cash, invoices, and upcoming expenses', done: false },
    { id: 'wr_customers', label: 'Follow up with at least one customer or prospect', done: false },
    { id: 'wr_content', label: 'Plan top marketing or content actions for next week', done: false },
    { id: 'wr_sops', label: 'Fix one broken or missing SOP', done: false },
    { id: 'wr_team', label: 'Clear blockers for yourself or the team', done: false },
    { id: 'wr_memories', label: 'Capture one lesson in Memories', done: false },
  ],
};

async function getWeeklyReview(workspaceId) {
  return withWorkspaceDb(workspaceId, (db) => {
    const raw = getSettingValue(db, workspaceId, 'weekly_review');
    if (!raw) {
      return { ...DEFAULT_WEEKLY_REVIEW, items: DEFAULT_WEEKLY_REVIEW.items.map((i) => ({ ...i })) };
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) {
        return { ...DEFAULT_WEEKLY_REVIEW, items: DEFAULT_WEEKLY_REVIEW.items.map((i) => ({ ...i })) };
      }
      return parsed;
    } catch {
      return { ...DEFAULT_WEEKLY_REVIEW, items: DEFAULT_WEEKLY_REVIEW.items.map((i) => ({ ...i })) };
    }
  });
}

async function saveWeeklyReview(workspaceId, state) {
  const payload = JSON.stringify(state);
  return withWorkspaceDb(workspaceId, (db) => {
    setSettingValue(db, workspaceId, 'weekly_review', payload);
    return state;
  });
}

async function getPreferredOllamaModel(workspaceId) {
  return withWorkspaceDb(workspaceId, (db) => {
    return getSettingValue(db, workspaceId, 'ollama_model');
  });
}

async function setPreferredOllamaModel(workspaceId, modelName) {
  const v = modelName == null || modelName === '' ? '' : String(modelName).trim();
  return withWorkspaceDb(workspaceId, (db) => {
    if (!v) {
      db.run('DELETE FROM settings WHERE workspace_id = ? AND key = ?', [workspaceId, 'ollama_model']);
      return null;
    }
    setSettingValue(db, workspaceId, 'ollama_model', v);
    return v;
  });
}

function cosineSimilarity(a, b) {
  if (!a?.length || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function upsertEmbeddingRow(db, workspaceId, entityType, entityId, vector) {
  db.run('DELETE FROM embeddings WHERE workspace_id = ? AND entity_type = ? AND entity_id = ?', [
    workspaceId,
    entityType,
    entityId,
  ]);
  const id = createId('emb');
  const now = Date.now();
  const json = JSON.stringify(vector);
  db.run(
    'INSERT INTO embeddings (id, workspace_id, entity_type, entity_id, dims, vector_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, workspaceId, entityType, entityId, vector.length, json, now],
  );
}

async function upsertMemoryEmbedding(workspaceId, memoryId, vector) {
  if (!Array.isArray(vector) || vector.length === 0) {
    return;
  }
  return withWorkspaceDb(workspaceId, (db) => {
    upsertEmbeddingRow(db, workspaceId, 'memory', memoryId, vector);
  });
}

async function upsertDocumentEmbedding(workspaceId, documentId, vector) {
  if (!Array.isArray(vector) || vector.length === 0) {
    return;
  }
  return withWorkspaceDb(workspaceId, (db) => {
    upsertEmbeddingRow(db, workspaceId, 'document', documentId, vector);
  });
}

async function deleteEmbeddingsForEntity(workspaceId, entityType, entityId) {
  return withWorkspaceDb(workspaceId, (db) => {
    db.run('DELETE FROM embeddings WHERE workspace_id = ? AND entity_type = ? AND entity_id = ?', [
      workspaceId,
      entityType,
      entityId,
    ]);
  });
}

async function semanticSearchMemories(workspaceId, queryVector, limit = 8) {
  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    return [];
  }
  return withWorkspaceDb(workspaceId, (db) => {
    const stmt = db.prepare(
      'SELECT entity_id AS entityId, vector_json AS vectorJson FROM embeddings WHERE workspace_id = ? AND entity_type = ?',
    );
    stmt.bind([workspaceId, 'memory']);
    const scored = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let vec;
      try {
        vec = JSON.parse(row.vectorJson);
      } catch {
        continue;
      }
      if (!Array.isArray(vec)) continue;
      const score = cosineSimilarity(queryVector, vec);
      scored.push({ memoryId: row.entityId, score });
    }
    stmt.free();
    scored.sort((x, y) => y.score - x.score);
    const top = scored.slice(0, limit).filter((s) => s.score > 0.05);
    const results = [];
    for (const t of top) {
      const mStmt = db.prepare(
        `SELECT id, workspace_id AS workspaceId, type, description, source_kind AS sourceKind,
          source_reference AS sourceReference, created_at AS createdAt
        FROM memories WHERE id = ? AND workspace_id = ?`,
      );
      mStmt.bind([t.memoryId, workspaceId]);
      if (!mStmt.step()) {
        mStmt.free();
        continue;
      }
      results.push({ memory: mStmt.getAsObject(), score: t.score });
      mStmt.free();
    }
    return results;
  });
}

function memoryEmbeddingText(type, description) {
  return `${String(type || '')}: ${String(description || '')}`.trim();
}

function getAssistantActionInstructions() {
  return [
    '',
    'Optional UI suggestions: if you want the user to open a screen or draft a task, append a single HTML comment as the very last characters of your reply (nothing after it):',
    '<!--PJaisActions:[{"type":"navigate","section":"tasks"}]-->',
    'Use section one of: dashboard, phases, tasks, vault, memories, maintenance, browser.',
    'You may also suggest: {"type":"createTask","title":"Short task title","description":"optional"}',
    'Do not fabricate PJaisActions unless it genuinely helps; users confirm actions in the UI.',
  ].join('\n');
}

function parsePjaisAssistantReply(raw) {
  const text = String(raw || '');
  const re = /<!--PJaisActions:\s*([\s\S]*?)-->\s*$/;
  const m = text.match(re);
  if (!m) {
    return { reply: text.trim(), suggestedActions: [] };
  }
  let suggestedActions = [];
  try {
    const parsed = JSON.parse(m[1].trim());
    if (Array.isArray(parsed)) {
      suggestedActions = parsed;
    }
  } catch {
    /* ignore */
  }
  return { reply: text.slice(0, m.index).trim(), suggestedActions };
}

async function importVaultFile(workspaceId, absoluteSourcePath) {
  if (!absoluteSourcePath || typeof absoluteSourcePath !== 'string') {
    throw new Error('Source path is required');
  }
  if (!fs.existsSync(absoluteSourcePath)) {
    throw new Error('Source file not found');
  }
  const stat = fs.statSync(absoluteSourcePath);
  if (!stat.isFile()) {
    throw new Error('Source must be a file');
  }

  const vaultDir = path.join(getWorkspaceDir(workspaceId), 'vault');
  if (!fs.existsSync(vaultDir)) {
    fs.mkdirSync(vaultDir, { recursive: true });
  }

  const baseName = path.basename(absoluteSourcePath);
  let destName = baseName;
  let destPath = path.join(vaultDir, destName);
  let i = 0;
  while (fs.existsSync(destPath)) {
    i += 1;
    const ext = path.extname(baseName);
    const stem = path.basename(baseName, ext);
    destName = `${stem}-${i}${ext}`;
    destPath = path.join(vaultDir, destName);
  }

  fs.copyFileSync(absoluteSourcePath, destPath);
  const relPath = path.join('vault', destName).replace(/\\/g, '/');
  const title = path.basename(destName);

  return createVaultItem({
    workspaceId,
    title,
    path: relPath,
    type: 'file',
  });
}

async function listMemories(workspaceId) {
  return withWorkspaceDb(workspaceId, (db) => {
    const stmt = db.prepare(
      `SELECT id, workspace_id AS workspaceId, type, description, source_kind AS sourceKind,
        source_reference AS sourceReference, created_at AS createdAt
      FROM memories WHERE workspace_id = ? ORDER BY created_at DESC`,
    );
    stmt.bind([workspaceId]);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  });
}

async function createMemory(input) {
  const id = createId('mem');
  const now = Date.now();
  return withWorkspaceDb(input.workspaceId, (db) => {
    db.run(
      'INSERT INTO memories (id, workspace_id, type, description, source_kind, source_reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        input.workspaceId,
        input.type,
        input.description,
        input.sourceKind,
        input.sourceReference ?? null,
        now,
      ],
    );
    return {
      id,
      workspaceId: input.workspaceId,
      type: input.type,
      description: input.description,
      sourceKind: input.sourceKind,
      sourceReference: input.sourceReference ?? null,
      createdAt: now,
    };
  });
}

async function updateMemory(workspaceId, memoryId, updates) {
  return withWorkspaceDb(workspaceId, (db) => {
    const setClauses = [];
    const bindings = [];
    if (updates.type !== undefined) {
      setClauses.push('type = ?');
      bindings.push(updates.type);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      bindings.push(String(updates.description));
    }
    if (updates.sourceKind !== undefined) {
      setClauses.push('source_kind = ?');
      bindings.push(updates.sourceKind);
    }
    if (updates.sourceReference !== undefined) {
      setClauses.push('source_reference = ?');
      bindings.push(updates.sourceReference ?? null);
    }
    if (setClauses.length === 0) {
      throw new Error('No valid updates provided');
    }
    bindings.push(memoryId, workspaceId);
    db.run(
      `UPDATE memories SET ${setClauses.join(', ')} WHERE id = ? AND workspace_id = ?`,
      bindings,
    );
    const stmt = db.prepare(
      'SELECT id, workspace_id AS workspaceId, type, description, source_kind AS sourceKind, source_reference AS sourceReference, created_at AS createdAt FROM memories WHERE id = ? AND workspace_id = ?',
    );
    stmt.bind([memoryId, workspaceId]);
    if (!stmt.step()) {
      stmt.free();
      throw new Error('Memory not found');
    }
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  });
}

async function deleteMemory(workspaceId, memoryId) {
  return withWorkspaceDb(workspaceId, (db) => {
    db.run('DELETE FROM embeddings WHERE workspace_id = ? AND entity_type = ? AND entity_id = ?', [
      workspaceId,
      'memory',
      memoryId,
    ]);
    db.run('DELETE FROM memories WHERE id = ? AND workspace_id = ?', [memoryId, workspaceId]);
  });
}

async function searchWorkspace(workspaceId, query) {
  const q = String(query || '').trim();
  if (!q) {
    return { memories: [], documents: [] };
  }
  const like = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
  return withWorkspaceDb(workspaceId, (db) => {
    const memStmt = db.prepare(
      `SELECT id, workspace_id AS workspaceId, type, description, source_kind AS sourceKind,
        source_reference AS sourceReference, created_at AS createdAt
      FROM memories
      WHERE workspace_id = ? AND (description LIKE ? ESCAPE '\\' OR type LIKE ? ESCAPE '\\')`,
    );
    memStmt.bind([workspaceId, like, like]);
    const memories = [];
    while (memStmt.step()) {
      memories.push(memStmt.getAsObject());
    }
    memStmt.free();

    const docStmt = db.prepare(
      `SELECT id, workspace_id AS workspaceId, title, path, type
      FROM documents
      WHERE workspace_id = ? AND (title LIKE ? ESCAPE '\\' OR path LIKE ? ESCAPE '\\')`,
    );
    docStmt.bind([workspaceId, like, like]);
    const documents = [];
    while (docStmt.step()) {
      documents.push(docStmt.getAsObject());
    }
    docStmt.free();

    const qLower = q.toLowerCase();
    const noteStmt = db.prepare(
      `SELECT id, workspace_id AS workspaceId, title, path, type FROM documents
      WHERE workspace_id = ? AND type = 'note'`,
    );
    noteStmt.bind([workspaceId]);
    const seenDocIds = new Set(documents.map((d) => d.id));
    while (noteStmt.step()) {
      const doc = noteStmt.getAsObject();
      if (seenDocIds.has(doc.id)) continue;
      try {
        const full = resolveWorkspaceRelativePath(workspaceId, doc.path);
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
          const body = fs.readFileSync(full, 'utf8').toLowerCase();
          if (body.includes(qLower)) {
            documents.push(doc);
            seenDocIds.add(doc.id);
          }
        }
      } catch {
        /* skip */
      }
    }
    noteStmt.free();

    return { memories, documents };
  });
}

/**
 * Parse user text for memory-save intent (used by offline stub and Ollama path).
 * @returns {{ type: string, description: string, sourceKind: string } | null}
 */
function extractSuggestedMemoryFromUserMessage(userMessage) {
  const msg = String(userMessage || '').trim();
  if (!msg) {
    return null;
  }
  const lower = msg.toLowerCase();
  if (
    !lower.startsWith('remember:') &&
    !lower.startsWith('save:') &&
    !/remember that\b/i.test(msg) &&
    !/please (save|store)\b/i.test(msg)
  ) {
    return null;
  }
  let body = msg.replace(/^(remember:|save:)\s*/i, '').trim();
  body = body.replace(/^remember that\s+/i, '').trim();
  const typeMatch = body.match(/^\(([^)]+)\)\s*(.*)$/);
  let memType = 'decision';
  if (typeMatch) {
    memType = typeMatch[1].trim().replace(/\s+/g, '_').toLowerCase() || 'decision';
    body = typeMatch[2].trim();
  }
  if (body.length === 0) {
    return null;
  }
  return {
    type: memType.slice(0, 64),
    description: body,
    sourceKind: 'chat',
  };
}

async function buildAssistantSystemPrompt(workspaceId, options = {}) {
  const includeActions = options.includeActions !== false;
  const ctx = await getWorkspaceAiContext(workspaceId);
  if (!ctx) {
    return 'You are PJais Copilot. No workspace context is available.';
  }
  const memories = (await listMemories(workspaceId)).slice(0, 15);
  const vault = (await listVaultItems(workspaceId)).slice(0, 20);
  const noteExcerpts = await collectNoteExcerptsForPrompt(workspaceId, 5500);

  const memLines = memories.map(
    (m) => `- [${m.type}] ${String(m.description).slice(0, 400)}`,
  );
  const vaultLines = vault.map((d) => `- ${d.title} (${d.type})`);

  const parts = [
    `You are PJais Copilot, a business assistant for a single workspace named "${ctx.workspace.name}".`,
    'Only use the context below for facts about this workspace. If something is unknown, say so.',
    'Keep answers concise and actionable.',
    '',
    `Open tasks (not done): ${ctx.openTaskCount}. Saved memories: ${ctx.memoryCount}. Phases: ${ctx.phaseCount}.`,
  ];
  if (ctx.workspace.description) {
    parts.push('', `Workspace description: ${ctx.workspace.description}`);
  }
  if (memLines.length) {
    parts.push('', 'Recent saved memories (may be incomplete):', ...memLines);
  }
  if (vaultLines.length) {
    parts.push('', 'Vault document titles:', ...vaultLines);
  }
  if (noteExcerpts.trim()) {
    parts.push('', 'Vault notes (excerpts, may be truncated):', noteExcerpts);
  }
  if (includeActions) {
    parts.push(getAssistantActionInstructions());
  }
  return parts.join('\n');
}

async function getWorkspaceAiContext(workspaceId) {
  const meta = await getWorkspaceMeta(workspaceId);
  if (!meta) {
    return null;
  }
  return withWorkspaceDb(workspaceId, (db) => {
    const taskStmt = db.prepare(
      'SELECT COUNT(*) AS c FROM tasks WHERE workspace_id = ? AND status != ?',
    );
    taskStmt.bind([workspaceId, 'done']);
    taskStmt.step();
    const openTasks = taskStmt.getAsObject().c;
    taskStmt.free();

    const memStmt = db.prepare('SELECT COUNT(*) AS c FROM memories WHERE workspace_id = ?');
    memStmt.bind([workspaceId]);
    memStmt.step();
    const memoryCount = memStmt.getAsObject().c;
    memStmt.free();

    const phaseStmt = db.prepare('SELECT COUNT(*) AS c FROM phases WHERE workspace_id = ?');
    phaseStmt.bind([workspaceId]);
    phaseStmt.step();
    const phaseCount = phaseStmt.getAsObject().c;
    phaseStmt.free();

    return {
      workspace: meta,
      openTaskCount: openTasks,
      memoryCount,
      phaseCount,
    };
  });
}

/**
 * Lightweight offline assistant: summarizes workspace context and echoes user input.
 * No external LLM — satisfies Phase 3 shell until local models are wired.
 */
function chatWithAssistant(workspaceId, userMessage, _history) {
  return getWorkspaceAiContext(workspaceId).then((ctx) => {
    if (!ctx) {
      return {
        reply: 'Workspace not found.',
        suggestedMemory: null,
        suggestedActions: [],
        usedOllama: false,
      };
    }
    const msg = String(userMessage || '').trim();
    const suggestedMemory = extractSuggestedMemoryFromUserMessage(msg);

    const lines = [
      `You are chatting about **${ctx.workspace.name}**.`,
      `Open tasks: **${ctx.openTaskCount}**. Saved memories: **${ctx.memoryCount}**. Phases: **${ctx.phaseCount}**.`,
    ];
    if (ctx.workspace.description) {
      lines.push(`Description: ${ctx.workspace.description}`);
    }
    if (msg) {
      lines.push('', `You said: ${msg}`);
    }
    if (suggestedMemory) {
      lines.push(
        '',
        '**Suggested memory** (review and approve below):',
        `Type: ${suggestedMemory.type}`,
        suggestedMemory.description,
      );
    } else {
      lines.push(
        '',
        'Tip: start a message with `remember:` or `Remember that …` to draft a memory for approval.',
      );
    }

    return {
      reply: lines.join('\n'),
      suggestedMemory,
      suggestedActions: [],
      context: ctx,
      usedOllama: false,
    };
  });
}

function suggestMemoryFromMessage(message) {
  const msg = String(message || '').trim();
  if (!msg) {
    return null;
  }
  let body = msg.replace(/^(remember:|save:)\s*/i, '').trim();
  body = body.replace(/^remember that\s+/i, '').trim();
  const typeMatch = body.match(/^\(([^)]+)\)\s*(.*)$/);
  let memType = 'decision';
  if (typeMatch) {
    memType = typeMatch[1].trim().replace(/\s+/g, '_').toLowerCase() || 'decision';
    body = typeMatch[2].trim();
  }
  if (!body) {
    return null;
  }
  return {
    type: memType.slice(0, 64),
    description: body,
    sourceKind: 'manual',
  };
}

module.exports = {
  listWorkspaces,
  createWorkspace,
  getWorkspaceMeta,
  listPhases,
  listTasks,
  createTask,
  updateTask,
  listVaultItems,
  createVaultItem,
  createVaultNote,
  readVaultDocumentText,
  importVaultFile,
  listMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  searchWorkspace,
  semanticSearchMemories,
  upsertMemoryEmbedding,
  upsertDocumentEmbedding,
  deleteEmbeddingsForEntity,
  memoryEmbeddingText,
  getWeeklyReview,
  saveWeeklyReview,
  getPreferredOllamaModel,
  setPreferredOllamaModel,
  getWorkspaceAiContext,
  buildAssistantSystemPrompt,
  extractSuggestedMemoryFromUserMessage,
  chatWithAssistant,
  suggestMemoryFromMessage,
  parsePjaisAssistantReply,
  getAssistantActionInstructions,
  getBaseDir,
};
