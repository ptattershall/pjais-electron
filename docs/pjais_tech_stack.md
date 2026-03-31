# PJais -- Technical Architecture

PJais is designed as a **local‑first desktop application**.

## Desktop Framework

Electron is used for cross‑platform desktop development.

Architecture:

Main Process - system integrations - file management - model runtime
management

Renderer - UI - user workflows - workspace interface

## Frontend

Recommended stack:

React\
TypeScript\
Webpack (via Electron Forge)

The renderer runs as a single-page application inside the main window
using a client-side router (e.g. MemoryRouter). React is responsible for:

- workspace dashboards
- phase/task views
- document vault UI
- structured memories UI
- maintenance hub
- the AI overlay shell

## Process Model and IPC

PJais follows the standard Electron process model:

- **Main process**: owns application lifecycle, window creation, file
  system access, SQLite database connections, model runtime management
  (Ollama), and in-app browser/BrowserView lifecycle.
- **Preload scripts**: run in an isolated context, use
  `contextBridge` + `ipcRenderer` to expose a small, explicit API into
  the renderer.
- **Renderer**: pure UI and user workflows. It never touches Node or
  Electron directly and only talks to the preload API.

Security defaults:

- `contextIsolation: true`
- `nodeIntegration: false`

All privileged operations (file system, database, models, in-app
browser control) go through explicit IPC channels in the main process,
exposed to the renderer as a small preload API (`window.pjais`, with
TypeScript declarations in the renderer). The renderer only sees
high-level methods such as workspace list/create, task CRUD, vault, and
memory operations.

## Local AI Models

The free tier allows users to **download a model suited to their
machine**.

Recommended runtime:

Ollama

Advantages: - easy model downloads - stable API - good hardware
detection

Example models:

Small computers - 3B--7B models

Mid‑range machines - 8B models

High‑end machines - 13B models

## Database Layer

PJais uses **SQLite** for structured application data and, in v0.1, for
embedding vectors as well (see [VECTORS.md](./VECTORS.md)). Optional
file-based vector indexes may be added later under each workspace’s
`vectors/` directory.

### SQLite (relational data and v0.1 embeddings)

Stores structured application data.

Tables may include: workspaces, phases, tasks, documents, memory
records, settings, and (v0.1) **embeddings** for vector payloads tied to
entities such as memories and vault notes.

SQLite works well with Electron and is simple to distribute.

### Embeddings and semantic search (v0.1)

Semantic search and AI context use **embedding vectors stored in SQLite**
(`embeddings.vector_json`), generated when Ollama (or a compatible
runtime) is available. Keyword search still works without embeddings.

**LanceDB** (`@lancedb/lancedb`) is an **optional** npm dependency for
future or experimental file-based indexes under each workspace’s
`vectors/` directory. It is not the shipping storage layer for v0.1; see
[VECTORS.md](./VECTORS.md).

## Local File Structure

Example workspace directory:

`PJais/workspaces/<workspace-id>/app.db` — SQLite (data + embeddings).

`PJais/workspaces/<workspace-id>/vectors/` — reserved; may hold
file-based vector stores later (see [VECTORS.md](./VECTORS.md)).

`PJais/workspaces/<workspace-id>/vault/` — user documents and files.

## Model Management

Models are either:

1. managed by Ollama
2. downloaded to a models directory

**Current (v0.1):** health check against Ollama (`/api/tags`), chat and
embeddings, workspace-scoped preferred model in settings, graceful
degradation when Ollama is missing.

**Planned / roadmap:** hardware detection, richer model recommendation,
in-app download manager, and fine-grained status (idle, downloading,
ready, error).

## Offline and Degradation

PJais is designed to be **local‑first** and work even when AI is
unavailable.

- If Ollama is not installed or a model is not downloaded, core
  workspace, task, and document features continue to work.
- When the AI runtime is unavailable, the overlay clearly shows a
  degraded state and does not attempt calls.
- Database access is fully local; if a workspace DB is corrupted, the
  app should fail gracefully and allow the user to recover or create a
  new workspace.
