# PJais -- Application Shell and AI Overlay

This document defines the **application shell**, core screens, and how
the **AI overlay** interacts with them.

The goal is to keep branding and UX consistent: AI is a **persistent
assistant** layered on top of the app, with controlled access to
workspace data and (eventually) in-app browser sessions.

## Main Window Layout

PJais uses a single primary window for v0.1:

- **Navigation sidebar**: workspace switching and top-level sections
  (Dashboard, Phases, Tasks, Vault, Memories, Maintenance, Browser).
- **Content area**: current screen for the selected workspace.
- **AI overlay region**: a persistent panel layered on top of the
  content (e.g. right-side drawer or floating panel).

The overlay is always available and scoped to the **current
workspace**.

## Screens

Initial screens inside the main window:

- **Workspace list / Home**: choose or create a workspace.
- **Workspace dashboard**: high-level overview of phases, tasks, and
  maintenance.
- **Phases**: list of phases and their generated action items.
- **Tasks**: task list and detail for the current workspace.
- **Document vault**: workspace documents and uploads.
- **Memories**: structured business memories (list, edit, delete) scoped
  to the workspace; pairs with the AI overlay save flow.
- **Maintenance hub**: v0.1 includes a persisted **weekly review**
  checklist; monthly reviews, KPIs, and calendars are planned.
- **Browser (v0.1)**: in-app **BrowserView** (main process) with URL
  entry and bounds synced to a reserved region in the renderer—manual
  browsing today; AI-assisted or automated control is future work (see
  below).

Navigation between these screens is handled in the renderer (e.g.
MemoryRouter).

## AI Overlay Behavior

The AI overlay sits on top of every screen and can:

- show context (current workspace, phase, selected task/document)
- answer questions and generate ideas
- suggest new tasks or edits to existing ones
- summarize documents or maintenance status

\"Control\" of screens is always **explicit and auditable**:

- the overlay can request actions such as \"open this phase\", \"create
  a task\", or \"open this document\".
- the renderer applies those actions via a clear UI state update; the
  user can see and override what happened.

For v0.1, AI control is **suggestion-first**. Automatic execution of
complex flows can be introduced later with more safety rails.

**Wired in v0.1:** when the assistant returns structured suggested
actions, the renderer can apply **navigation** to known sections
(dashboard, phases, tasks, vault, memories, maintenance, browser) and
**create task** (then navigate to Tasks)—see `AssistantActionsProvider`
and the overlay UI. Other actions (e.g. open a specific document) remain
to be added with the same explicit pattern.

## In-App Browser and Joint Control (Future)

Some workflows benefit from AI + user working together inside a
browser (e.g. filling forms, researching, or operating web tools).

**v0.1 status:** the main process already hosts a `BrowserView` and IPC
for show/hide, bounds, and `loadURL`; the AI overlay does not yet drive
the browser or read page content.

**Future direction:**

- The **main process** continues to own `BrowserView` lifecycle (already
  started in v0.1).
- The **Browser screen** in the renderer reserves a content area where
  the BrowserView is visible.
- The **AI overlay** for this screen:
  - can see high-level browser state (current URL, title, maybe some
    extracted content via IPC).
  - can request structured actions (`navigate`, `click`, `fillField`,
    etc.) that the main process or a dedicated preload in the
    BrowserView executes.

Joint control model:

- **User**: interacts with the browser as normal (click, type,
  navigate).
- **AI**: suggests or triggers actions; the UI shows what is happening
  so the user can intervene or cancel.

This keeps the branding promise of AI as a powerful overlay while
maintaining user control and safety.

## Responsibilities Summary

- **Main process**:
  - window and BrowserView lifecycle
  - filesystem and SQLite access
  - Ollama / model runtime management
  - IPC handlers for workspace, tasks, vault, memory, and browser
    control
- **Preload**:
  - exposes a minimal, typed API to the renderer via `contextBridge`
  - hides raw IPC channels
- **Renderer (React)**:
  - application shell and navigation
  - AI overlay UI
  - screen components that consume the preload API
