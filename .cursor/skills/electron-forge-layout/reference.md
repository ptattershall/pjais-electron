# Electron Forge Layout – Reference

## Using Up-to-Date Documentation

1. **Resolve library ID** (Context7 MCP): Call `resolve-library-id` with a query like "electron" or "electron-forge" to get the exact ID (e.g. `/electron/electron`, `/electron/electron-forge`).
2. **Query docs**: Call `query-docs` with that `libraryId` and a specific question. Examples:
   - "BrowserWindow webPreferences contextIsolation and nodeIntegration"
   - "webpack plugin entryPoints multiple renderers and preload"
   - "IPC main and renderer contextBridge preload"
   - "security best practices context isolation"
3. Prefer replying with citations from the returned docs. If the tool is unavailable, note it and give best-effort guidance.

## Key Electron Concepts (Summary)

- **Main process**: Node.js; runs `main` entry; creates windows, app lifecycle, system APIs.
- **Renderer process**: Per window; by default a web environment (no Node). Use preload to expose a small API.
- **Preload script**: Runs before the page in the renderer; has access to both Node and a limited DOM. Use `contextBridge.exposeInMainWorld()` to expose only what the renderer needs.
- **Context isolation**: When true (default), preload and page run in separate contexts; the page cannot touch Node or the full preload. Always prefer keeping it true.

## Forge Webpack Plugin – Quick Reference

| Config key | Purpose |
|------------|--------|
| `mainConfig` | Webpack config path for main process |
| `renderer.config` | Webpack config path for renderers |
| `renderer.entryPoints` | Array of `{ name, html, js, preload?: { js } }` |
| `renderer.nodeIntegration` | If true, renderer target is `electron-renderer`; must match `webPreferences.nodeIntegration` in code |
| `devServer` | webpack-dev-server options (dev only) |
| `devContentSecurityPolicy` | CSP in development |

Magic globals: for entry point `name: 'main_window'` → `MAIN_WINDOW_WEBPACK_ENTRY`, `MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY`. Only defined in main process.

## Common Pitfalls

- **main in package.json**: Must be `".webpack/main"` for the webpack plugin, not `src/main.js`.
- **Preload path**: Never hardcode `__dirname` or file paths for the webpack-built preload/renderer; use the magic globals.
- **nodeIntegration**: If you set it in `BrowserWindow`, set the same in Forge plugin `renderer.nodeIntegration` (and per-entry overrides if used).
- **Native modules**: Use the asset relocator and node-loader in `webpack.rules`; keep asset relocator at the version recommended by Forge (e.g. 1.7.3).
- **Virtual routing**: In production the app is file-based; use MemoryRouter (or equivalent) for SPA routing, not history that assumes a server base URL.

## TypeScript

- In main process, declare magic globals: `declare const MAIN_WINDOW_WEBPACK_ENTRY: string;` (and preload).
- Add ts-loader (or equivalent) in `webpack.rules.js` for `.ts`/`.tsx`; point main and renderer entries to `.ts`/`.tsx` in `forge.config.js` and webpack configs.
