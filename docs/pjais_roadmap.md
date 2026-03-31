# PJais -- Development Roadmap

This roadmap focuses on shipping a functional **v0.1** quickly.

## Current status (snapshot)

As of the latest app + docs pass:

- **Phases 1–3 (planning, desktop foundation, AI integration):** largely
  in place—workspaces, phases/tasks, vault, memories UI, AI overlay chat,
  workspace search (keyword + optional semantic for memories when Ollama
  embeddings work), memory commit flow with user approval.
- **Phase 4 (local model support):** **partial**—Ollama health, chat,
  embeddings, workspace preferred model; **not yet** hardware detection,
  in-app download manager, or rich status beyond degraded/ready messaging.
- **Phase 5 (memory system):** **partial**—structured memories, embedding
  generation when Ollama is available, vectors stored in SQLite per
  [VECTORS.md](./VECTORS.md); LanceDB remains optional/future, not the
  primary store.
- **Phase 6 (maintenance hub):** **partial**—weekly review checklist with
  persistence; monthly review, KPIs, marketing calendar, and broader
  checklists still to do.
- **Phase 7 (distribution):** **docs and Forge outputs**—[INSTALL.md](./INSTALL.md)
  and [DISTRIBUTION.md](./DISTRIBUTION.md) describe installers and messaging;
  a public **download/marketing site** typically lives **outside** this
  repository.

## Phase 1 -- Planning

Define: - workspace concept - phase templates - action item structure -
maintenance modules

Create documentation: - product requirements - data model - system
architecture

## Phase 2 -- Desktop Foundation

Build Electron app with:

- workspace creation
- workspace switching
- task system
- document vault

## Phase 3 -- AI Integration

Add AI features:

- chat interface in the AI overlay
- workspace-aware suggestions
- basic document and memory search (keyword / filters)

Add **simple memory commit flow**:

- AI suggests important information to save
- user approves or edits
- memory records stored in SQLite; embeddings written when Ollama (or a
  compatible runtime) is available (see [VECTORS.md](./VECTORS.md))

## Phase 4 -- Local Model Support

Implement:

- hardware detection
- recommended model selection
- model download manager
- model status monitoring

## Phase 5 -- Memory System

Implement:

- structured memory storage (across memory types)
- embedding generation
- vector search retrieval
- workspace scoped memories
- semantic document and memory search integrated into the overlay

## Phase 6 -- Maintenance Hub

Add modules:

Weekly review\
Monthly review\
KPIs\
Marketing calendar\
Operations checklist

## Phase 7 -- Distribution

Update distribution site with:

- clear product positioning
- download links
- installation guide
- model setup instructions

## Future Versions

v0.2 - integrations - automation tools

v0.3 - optional cloud sync - team workspaces

## Quality and Testing

Throughout all phases:

- add unit tests for the data access layer and critical workflows
- add light end-to-end coverage for workspace/task flows and AI
  interaction
- keep linting and formatting configured for a consistent codebase

**Today:** `npm test` runs Node tests (e.g. workspace store) and the IPC
surface smoke test; Playwright is a **separate** command
(`npm run test:playwright`) and needs a built bundle first—see
[INSTALL.md](./INSTALL.md).
