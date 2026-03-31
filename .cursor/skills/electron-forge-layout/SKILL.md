---
name: electron-forge-layout
description: Guides layout and structure of codebases using Electron Forge and the webpack plugin. Uses up-to-date documentation for a consistent, logical approach. Handles main/renderer/preload separation, entry points, security, and framework-specific nuances. Use when structuring or refactoring an Electron Forge app, adding windows or preload scripts, or when the user asks about Electron Forge project layout, process model, or Electron framework differences.
---

# Electron Forge Layout & Structure

## When to Use This Skill

Apply when the user is:
- Structuring or refactoring an Electron Forge project
- Adding new windows, renderer entry points, or preload scripts
- Asking about main vs renderer vs preload, context isolation, or IPC
- Configuring or debugging Forge webpack plugin, `forge.config.js`, or entry points
- Dealing with Electron-specific nuances (security, Node integration, native modules, routing in packaged apps)

## Documentation First

Before giving layout or config advice that depends on current APIs or defaults:

1. **Resolve library ID** (Context7): Call the resolve-library-id MCP tool for `electron` and/or `electron-forge` to get the exact library ID (e.g. `/electron/electron`, `/electron/electron-forge`).
2. **Query docs** (Context7): Use the query-docs MCP tool with that library ID and a specific question (e.g. "BrowserWindow webPreferences and contextIsolation", "webpack plugin entryPoints and multiple windows").
3. Prefer answers that cite the fetched documentation. If docs are unavailable, state that and give best-effort guidance.

Limit to 3 documentation queries per request; then proceed with the best information available.

## Standard Layout (Webpack Plugin)

### Directory structure

Keep this layout consistent:

```
project-root/
├── forge.config.js          # Forge config: makers, plugins, webpack plugin
├── package.json             # main: ".webpack/main"
├── webpack.main.config.js   # Main process entry + rules (e.g. webpack.rules)
├── webpack.renderer.config.js
├── webpack.rules.js         # Shared rules (native modules, TS, etc.)
└── src/
    ├── main.js              # Main process entry (uses magic globals)
    ├── preload.js           # Preload for main window (or per-window)
    ├── index.html           # HTML for main renderer
    ├── renderer.js          # Renderer entry for main window
    └── (optional) index.css or other renderer assets
```

Optional but recommended as the app grows:

- `src/main/` – split main process (e.g. `menu.js`, `windows.js`, `ipc.js`) and require from `main.js`
- `src/preload/` – one preload per entry point if you have multiple windows
- `src/renderer/` – per-window folders (e.g. `main/`, `settings/`) with their own `index.html` and entry JS

### forge.config.js

- **mainConfig** – path to webpack config for the main process (e.g. `./webpack.main.config.js`).
- **renderer.config** – path to webpack config for all renderers.
- **renderer.entryPoints** – array of `{ name, html, js, preload?: { js } }`.
  - `name`: used for magic globals: `NAME_WEBPACK_ENTRY`, `NAME_PRELOAD_WEBPACK_ENTRY` (name is uppercased, spaces → underscores).
  - Add one entry per window (or per logical “app” that gets its own HTML).

### package.json

- Set `"main": ".webpack/main"` when using the Forge webpack plugin. Do not point `main` at `src/main.js`.

### Main process

- Entry file is the one specified in `webpack.main.config.js` (e.g. `./src/main.js`).
- Use only the **magic globals** for loading renderers and preloads: `MAIN_WINDOW_WEBPACK_ENTRY`, `MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY`, etc. Do not use `path.join(__dirname, ...)` or raw file paths for these.
- If using TypeScript, declare globals: `declare const MAIN_WINDOW_WEBPACK_ENTRY: string;` (and same for preload).

### Preload

- Runs in an isolated context; use `contextBridge` and `ipcRenderer` to expose a small, explicit API to the renderer. Do not expose entire Node or Electron APIs.
- Preload is built by webpack; no HMR for preload – reload the window to see changes.

### Renderer

- By default, renderer target is `web` and `nodeIntegration` is false. Use preload + IPC for main-process or Node features.
- If you enable `nodeIntegration: true`, set `renderer.nodeIntegration: true` in the Forge webpack plugin config as well (target becomes `electron-renderer`). Prefer keeping it false and using preload + IPC.

## Checklist for New Entry Points (New Window)

1. Add an object to `renderer.entryPoints` in `forge.config.js`: `name`, `html`, `js`, and if needed `preload.js`.
2. In main process, create a new `BrowserWindow` and use `NAME_WEBPACK_ENTRY` and `NAME_PRELOAD_WEBPACK_ENTRY` for that `name` (uppercased, e.g. `settings_window` → `SETTINGS_WINDOW_WEBPACK_ENTRY`).
3. Add the HTML and JS files under `src/` (or under `src/renderer/<name>/`).
4. If the window needs main-process APIs, add or reuse a preload and expose APIs via `contextBridge`.

## Nuances & Pitfalls

- **Routing in production**: Renderer is loaded from the filesystem. Use `MemoryRouter` (or similar) for React Router; avoid relying on browser history/base URL in packaged apps.
- **Native Node modules**: Use the shared `webpack.rules` with `node-loader` and `@vercel/webpack-asset-relocator-loader`; pin `@vercel/webpack-asset-relocator-loader@1.7.3` per Forge recommendation.
- **Security**: Keep `contextIsolation: true` and `nodeIntegration: false` unless you have a clear reason; communicate with main via preload + IPC only.
- **Preload path in renderer**: Magic globals exist only in the main process. To use a preload path in a renderer (e.g. for a subframe), pass it via synchronous IPC from main (e.g. `ipcMain.on('get-preload-path', (e) => { e.returnValue = MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY; })`).

## Additional Resources

- For Electron process model, security, and API details, use Context7 with the Electron library ID (see [reference.md](reference.md)).
- For Forge webpack plugin options (devServer, nodeIntegration, multiple entry points), use Context7 with the Electron Forge library ID or see [reference.md](reference.md).
