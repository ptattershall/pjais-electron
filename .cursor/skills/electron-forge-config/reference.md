# Electron Forge Config — Reference

Official documentation: **https://www.electronforge.io/**

## Configuration Overview

- Config can live in `forge.config.js` (root) or `package.json` under `config.forge`.
- Forge looks for `forge.config.js` by default.
- Top-level keys: `packagerConfig`, `rebuildConfig`, `makers`, `plugins`, `publishers`, `hooks`, `buildIdentifier`, `outDir`.

## Links (Electron Forge)

| Topic | URL |
|-------|-----|
| Getting started | https://www.electronforge.io/ |
| Configuration | https://www.electronforge.io/configuration |
| Configuration (overview) | https://www.electronforge.io/config/configuration |
| Plugins | https://www.electronforge.io/config/plugins |
| Makers | https://www.electronforge.io/config/makers |
| Publishers | https://www.electronforge.io/config/publishers |
| Hooks | https://www.electronforge.io/config/hooks |
| TypeScript | https://www.electronforge.io/config/typescript |

## packagerConfig (electron-packager)

Options are passed to `@electron/packager`. Do not override: `dir`, `arch`, `platform`, `out`, `electronVersion`. Common: `asar`, `icon`, `executableName`, `extraResource`, `ignore`.

## Makers (common)

| Package | Typical use |
|---------|-------------|
| `@electron-forge/maker-squirrel` | Windows installer |
| `@electron-forge/maker-zip` | macOS/Linux zip |
| `@electron-forge/maker-dmg` | macOS DMG |
| `@electron-forge/maker-deb` | Debian/Ubuntu |
| `@electron-forge/maker-rpm` | RPM (Linux) |
| `@electron-forge/maker-pkg` | macOS pkg |

Each maker: `{ name: '@electron-forge/maker-...', platforms?: string[], config?: object }`.

## Webpack plugin (plugin-webpack)

Under `plugins`:

```js
{
  name: '@electron-forge/plugin-webpack',
  config: {
    mainConfig: './webpack.main.config.js',
    renderer: {
      config: './webpack.renderer.config.js',
      entryPoints: [
        { name: 'main_window', html: './src/index.html', js: './src/renderer.js', preload: { js: './src/preload.js' } }
      ]
    }
  }
}
```

- **mainConfig**: Path to main process webpack config.
- **renderer.config**: Path to renderer webpack config (shared by all entry points).
- **renderer.entryPoints**: Defines each window; `name` drives magic globals (`MAIN_WINDOW_WEBPACK_ENTRY`, etc.).

## Fuses plugin

`@electron-forge/plugin-fuses` with `@electron/fuses`: sets RunAsNode, cookie encryption, Node options, etc. at package time. See project `forge.config.js` for current usage.

## Context7

For latest API details, use MCP Context7: resolve library ID for `electron-forge`, then query-docs with a specific question (e.g. "packagerConfig asar options", "maker-squirrel config").
