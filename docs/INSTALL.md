# Installing PJais (development)

## Prerequisites

- Node.js 20+ recommended
- Git

## Clone and install

```bash
git clone <your-repo-url> pjais-electron
cd pjais-electron
npm install
```

## Run the app

```bash
npm start
```

Electron Forge builds the main and renderer webpack bundles, then launches Electron.

## Data directory

By default, workspace data is stored under your user home:

- Windows: `%USERPROFILE%\PJais\`
- macOS / Linux: `~/PJais/`

For automated tests, set `PJAIS_TEST_HOME` to a temporary directory so the app does not touch real data.

## Local AI (Ollama)

1. Install [Ollama](https://ollama.com/) for your platform.
2. Pull at least one model, for example:

   ```bash
   ollama pull llama3.2
   ```

3. Ensure Ollama is running (default API: `http://127.0.0.1:11434`).

Optional environment variables:

- `OLLAMA_HOST` — base URL if Ollama listens elsewhere.
- `PJAIS_OLLAMA_MODEL` — global default model name (workspace-specific choice in the app overrides when set in the UI).

Embedding-capable models improve semantic memory search; many chat models also expose embeddings via Ollama’s `/api/embeddings`. If embeddings fail, keyword search still works.

## Tests

```bash
npm test
```

Playwright-driven smoke (launches Electron). The Forge webpack main bundle must exist first (for example run `npm run package` once, or `npm start` until compile finishes):

```bash
npx playwright install
npm run package
npm run test:playwright
```

## Packaging

```bash
npm run package
npm run make
```

Outputs appear under `out/` per your Forge makers configuration.
