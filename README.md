# PJais (Electron)

**PJais** is a local-first AI business operating system: workspaces, phased planning, tasks, a document vault, structured memories, and an AI copilot scoped to the current workspace. Core features work without Ollama; the assistant degrades gracefully when no local model is available.

This repository is the **desktop app** (Electron + Electron Forge + React).

## Quick start

```bash
npm install
npm start
```

For prerequisites, data directory layout, Ollama setup, tests, and packaging, see **[docs/INSTALL.md](docs/INSTALL.md)**.

## Documentation

| Doc | Purpose |
| --- | --- |
| [docs/pjais_overview.md](docs/pjais_overview.md) | Product overview |
| [docs/pjais_roadmap.md](docs/pjais_roadmap.md) | Roadmap and current status snapshot |
| [docs/pjais_data_model.md](docs/pjais_data_model.md) | Data model and SQLite schema |
| [docs/pjais_memory_system.md](docs/pjais_memory_system.md) | Memory types and commit flow |
| [docs/VECTORS.md](docs/VECTORS.md) | Embeddings and semantic search (v0.1) |
| [docs/pjais_tech_stack.md](docs/pjais_tech_stack.md) | Architecture and stack |
| [docs/pjais_shell_ux.md](docs/pjais_shell_ux.md) | Shell, screens, AI overlay |
| [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) | Releases and download-page checklist |
| [docs/INSTALL.md](docs/INSTALL.md) | Development install and testing |

## License

MIT—see [package.json](package.json).
