# PJais -- Data Model

PJais uses **SQLite** (relational data and **v0.1 embedding vectors**),
optional **file-based vector stores** in the future, and the filesystem
(vault) to store workspace data.

This document describes the core entities and how they relate.

## v0.1 implementation note

Shipping builds store embedding **vectors inside the per-workspace SQLite
database** (`embeddings` table, JSON float arrays), with semantic search
over memories (and related flows) documented in [VECTORS.md](./VECTORS.md).
The workspace `vectors/` directory is reserved for future file-based indexes
(e.g. LanceDB experiments via optional `@lancedb/lancedb`); it is not required
for embeddings today.

## Storage Overview

- **SQLite**: primary source of truth for structured data
  (workspaces, phases, tasks, documents, memories, settings) **and** for
  v0.1 embedding payloads keyed by entity type and id.
- **Optional LanceDB (future / experimental)**: not used as the primary
  store in v0.1; see [VECTORS.md](./VECTORS.md).
- **Vault (filesystem)**: user documents and files, organized per
  workspace.

## Entities

### Workspace

Represents a single business or project.

Stored in **SQLite**.

Suggested fields:

- `id` (string, primary key)
- `name` (string)
- `slug` (string, optional)
- `description` (string, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Relationships:

- has many **phases**
- has many **tasks**
- has many **documents**
- has many **memories**

### Phase

Represents a step in the business lifecycle (Idea → Offer, Brand &
Messaging, etc).

Stored in **SQLite**.

Suggested fields:

- `id` (string, primary key)
- `workspace_id` (foreign key → workspace.id)
- `name` (string)
- `order_index` (number)
- `template_key` (string, optional)
- `created_at` (timestamp)

Relationships:

- belongs to **workspace**
- has many **tasks**

### Task (Action Item)

Represents an actionable item tied to a phase or maintenance flow.

Stored in **SQLite**.

Suggested fields:

- `id` (string, primary key)
- `workspace_id` (foreign key → workspace.id)
- `phase_id` (foreign key → phase.id, nullable for maintenance tasks)
- `title` (string)
- `description` (string, optional)
- `status` (enum: `pending`, `in_progress`, `done`, `blocked`)
- `owner` (string, optional)
- `due_date` (timestamp, optional)
- `completed_at` (timestamp, optional)
- `created_at` (timestamp)
- `completion_notes` (text, optional; set when wrapping up a task)
- `evidence_document_id` (string, optional; links to a vault document)

Relationships:

- belongs to **workspace**
- optionally belongs to **phase**
- may link to evidence **documents** or **memories**

### Document (Vault Item)

Represents a file or structured note stored in the workspace vault.

Metadata stored in **SQLite**; file contents live in the **vault
filesystem**.

Suggested fields:

- `id` (string, primary key)
- `workspace_id` (foreign key → workspace.id)
- `title` (string)
- `path` (string, relative path inside workspace vault directory)
- `type` (enum: `note`, `file`, `sop`, `strategy`, etc.)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Relationships:

- belongs to **workspace**
- may be referenced by **memories**

### Memory

Structured record of important business information.

Primary record stored in **SQLite**; **v0.1** embeddings for that memory
live in the same database in the **`embeddings`** table (see Schema v1 and
[VECTORS.md](./VECTORS.md)), keyed by `entity_type` + `entity_id`.

Suggested fields (SQLite):

- `id` (string, primary key)
- `workspace_id` (foreign key → workspace.id)
- `type` (enum/string; e.g. `brand_voice`, `offer`, `decision`,
  `policy`, `sop`, `client`)
- `description` (text)
- `source_kind` (enum: `chat`, `document`, `manual`)
- `source_reference` (string, optional; could be a document id, task
  id, or message id)
- `created_at` (timestamp)

Embedding row (same DB, v0.1):

- `entity_type` (e.g. `memory`), `entity_id` → memory.id
- `vector_json` (JSON array of floats), dimensions, timestamps

### Settings

Global and per-workspace configuration.

Stored in **SQLite**.

Examples:

- `id` (string, primary key)
- `scope` (enum: `global`, `workspace`)
- `workspace_id` (nullable if scope = global)
- `key` (string)
- `value` (JSON)

Used for:

- model preferences
- hardware detection results
- feature flags

## Workspace Directory Layout

- **Global registry**: `PJais/app.db` holds the list of workspaces so the app can list/create workspaces without opening each workspace DB.
- **Per-workspace**: each workspace has its own directory and DB:

```text
PJais/
  app.db              # Global: workspaces table only
  workspaces/
    <workspace-id>/
      app.db          # SQLite: structured data + embeddings (v0.1)
      vectors/        # Reserved; optional future file-based vector index (see VECTORS.md)
      vault/          # user documents and uploads
```

The Electron main process is responsible for:

- resolving the base data path
- creating workspace directories
- opening SQLite connections
- initializing tables when they are missing

The renderer never touches these paths directly; it only calls IPC
methods exposed by preload.

## Schema v1 (SQLite)

Implementations should create these tables so that migrations and tooling stay consistent.

### Global DB (`PJais/app.db`)

```sql
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Per-workspace DB (`workspaces/<workspace-id>/app.db`)

```sql
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
  completion_notes TEXT,
  evidence_document_id TEXT,
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
```

Status and type columns use string values (e.g. `pending`, `in_progress`, `done`, `blocked` for tasks; `note`, `file`, `sop`, `strategy` for documents). Timestamps are stored as integers (Unix ms).

Older databases may receive `completion_notes` and `evidence_document_id` on `tasks` via migration (`ALTER TABLE` when columns are missing); new installs should include them in the create definition above.

### Implementation note

The app uses **sql.js** (WASM, no native build) for the SQLite backend so it runs on all platforms without node-gyp. The main process keeps `sql.js` as a webpack external so it loads at runtime from `node_modules`. Data lives under `~/PJais/` (global `app.db` and per-workspace `workspaces/<id>/app.db`). Any previous JSON store at `~/PJais/workspaces/app.json` is not migrated; the first run with SQLite starts with an empty database. A future native **better-sqlite3** backend can be swapped in for the same schema if the user rebuilds it for their Electron version.
