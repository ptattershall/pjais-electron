# Distribution and releases

## Product positioning

PJais is a **local-first AI business operating system**: workspaces, phased planning, tasks, a document vault, structured memories, and an AI copilot that stays scoped to the current workspace. Core features work without Ollama; the assistant degrades gracefully when no model is available.

## What to ship

- **Installers** produced by Electron Forge (`npm run make`): Squirrel/Zip (Windows), DMG/ZIP (macOS), deb/rpm (Linux) depending on configured makers.
- **Architecture**: communicate that data lives under the user’s `PJais` folder (global registry + per-workspace SQLite, vault files, reserved `vectors/` directory).
- **Privacy**: emphasize on-device storage and optional local models via Ollama.

## Download page checklist

- Short value proposition and screenshot or GIF of the shell (sidebar + workspace + AI panel).
- Minimum OS versions and approximate disk space (app + models).
- Link to installation steps in [INSTALL.md](./INSTALL.md).
- Link to Ollama setup and a suggested starter model (e.g. `llama3.2`).
- Changelog or release notes per version.

## Model setup for end users

1. Install Ollama from the official site.
2. Run `ollama pull <model>` once.
3. Start PJais; use the copilot panel to pick a **preferred model** for the workspace if the default is wrong.

## Support

Document where to report issues (e.g. GitHub) and that logs may be requested from DevTools in development builds.
