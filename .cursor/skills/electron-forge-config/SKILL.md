---
name: electron-forge-config
description: Handles all root-level configuration files for Electron Forge projects (forge.config.js, package.json, webpack.main.config.js, webpack.renderer.config.js, webpack.rules.js). Use when editing, adding, or debugging Forge config, makers, plugins, packager options, webpack plugin settings, or package.json scripts and main entry.
---

# Electron Forge Root Configuration

This skill applies when working with **root-level configuration files only** in an Electron Forge project. Use [Electron Forge documentation](https://www.electronforge.io/) as the source of truth; for deeper API details, use Context7 with library ID for `electron-forge` then query-docs (limit 3 queries per request).

## When to Use This Skill

- User asks to change or add Forge config, makers, plugins, or packager options
- User asks about or edits `forge.config.js`, `package.json`, or `webpack.*.js` at project root
- User asks about build scripts (`start`, `package`, `make`, `publish`), `main` entry, or webpack plugin entry points
- User asks about hooks, rebuildConfig, or publishing configuration

## Root Config Files (Scope)

| File | Purpose |
|------|--------|
| `forge.config.js` | Forge config: packagerConfig, makers, plugins, publishers, hooks, rebuildConfig |
| `package.json` | `main`, scripts, productName; Forge also reads `config.forge` if present |
| `webpack.main.config.js` | Main process bundle entry and rules (referenced by plugin) |
| `webpack.renderer.config.js` | Renderer bundle config and rules (referenced by plugin) |
| `webpack.rules.js` | Shared webpack rules (native modules, TS, etc.); required by main and renderer configs |

Do **not** use this skill for source code under `src/` or other non-root config.

## Documentation First

Before changing options that depend on current Forge or plugin APIs:

1. **Context7**: Call `resolve-library-id` for `electron-forge` (and `electron` if needed), then `query-docs` with a specific question (e.g. "forge.config.js packagerConfig options", "webpack plugin renderer entryPoints").
2. **Official docs**: Check [Configuration](https://www.electronforge.io/configuration), [Plugins](https://www.electronforge.io/config/plugins), [Makers](https://www.electronforge.io/config/makers), [Publishers](https://www.electronforge.io/config/publishers).
3. Prefer answers that cite the fetched documentation.

Limit to 3 documentation queries per request; then proceed with the best information available.

## forge.config.js

- **packagerConfig**: Passed to `@electron/packager`. Common: `asar: true`, `icon`, `executableName`. Do not override `dir`, `arch`, `platform`, `out`, `electronVersion`.
- **rebuildConfig**: Options for native module rebuilding.
- **makers**: Array of `{ name, platforms?, config? }`. Each maker produces a distributable format (e.g. squirrel, zip, deb, rpm). `platforms` limits which OS (e.g. `['darwin']`).
- **plugins**: Array of plugin objects or instances (e.g. `@electron-forge/plugin-webpack`, `@electron-forge/plugin-fuses`). Webpack plugin needs `mainConfig`, `renderer.config`, `renderer.entryPoints`.
- **publishers**: Optional; where to publish artifacts (e.g. GitHub).
- **hooks**: Optional; lifecycle hooks (e.g. `packageAfterCopy`).
- **buildIdentifier** / **outDir**: Optional overrides for build output.

When adding a new maker or plugin, install its package first (`npm install --save-dev @electron-forge/maker-...` or `@electron-forge/plugin-...`), then add the entry to `forge.config.js`.

## package.json

- **main**: Must be `".webpack/main"` when using the Forge webpack plugin. Do not point at `src/main.js`.
- **scripts**: Typically `start`, `package`, `make`, `publish` (all via `electron-forge`). Leave as-is unless adding custom scripts.
- **productName**: Used for app name in distributables; can differ from `name`.
- **config.forge**: Alternative to `forge.config.js`; if both exist, Forge uses its merge rules (see docs).

## Webpack Configs (Webpack Plugin)

- **webpack.main.config.js**: Set `entry` to main process entry (e.g. `./src/main.js`). Use `module.rules: require('./webpack.rules')`.
- **webpack.renderer.config.js**: Add renderer-specific rules (e.g. CSS), then `module.rules` = shared rules plus those. Do not set `entry` here; entries come from `forge.config.js` → plugin `renderer.entryPoints`.
- **webpack.rules.js**: Export an array of rules. Include native module handling: `node-loader` for `.node` in `native_modules`, `@vercel/webpack-asset-relocator-loader` for `node_modules` (pin `^1.7.3` per Forge). Add TS/JS loaders here if using TypeScript.

**Entry points** are defined only in `forge.config.js` under `plugins` → webpack plugin → `renderer.entryPoints`. Each entry: `name`, `html`, `js`, and optionally `preload: { js }`. Changing or adding a window requires updating both `forge.config.js` and the corresponding HTML/JS (and preload) files under `src/`.

## Checklist for Common Tasks

**Add a new maker (e.g. DMG on macOS):**
- [ ] Install maker package
- [ ] Add `{ name: '@electron-forge/maker-...', config?: {}, platforms?: [] }` to `makers` in `forge.config.js`

**Add a new renderer window:**
- [ ] Add entry to `renderer.entryPoints` in `forge.config.js` (name, html, js, preload?)
- [ ] Create HTML and JS (and preload) under `src/`
- [ ] In main process, use `NAME_WEBPACK_ENTRY` and `NAME_PRELOAD_WEBPACK_ENTRY` (name uppercased, spaces → underscores)

**Change main process entry file:**
- [ ] Update `entry` in `webpack.main.config.js`
- [ ] Ensure `package.json` `main` remains `".webpack/main"`

**Add TypeScript:**
- [ ] Add ts-loader (or equivalent) rule in `webpack.rules.js`
- [ ] Point main/renderer entries at `.ts`/`.tsx` in `webpack.main.config.js` and `forge.config.js` as needed
- [ ] See [Forge TypeScript Setup](https://www.electronforge.io/config/typescript) if documented

## Additional Resources

- Detailed config options and plugin/maker lists: [reference.md](reference.md)
- For app layout, entry points, and preload/main/renderer separation, use the **electron-forge-layout** skill.
