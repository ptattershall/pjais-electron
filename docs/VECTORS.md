# Vector storage and semantic search

## Current implementation (v0.1)

- **Embeddings** are stored in each workspace SQLite database in the `embeddings` table (`vector_json` holds a JSON array of floats, keyed by `entity_type` + `entity_id`).
- **Memories** are embedded when created or updated (main process, via Ollama `/api/embeddings` when available).
- **Vault notes** (Markdown under `vault/notes/`) are embedded after save for optional semantic use later; keyword search also scans note file contents.
- **Semantic search** combines SQL `LIKE` results with cosine similarity over stored memory vectors (see `semanticSearchMemories` in `workspace-store.js`).

## `workspaces/<id>/vectors/`

Each workspace directory includes a `vectors/` folder with a short `STORAGE.txt` explaining that the primary vector index lives in SQLite for portability. This folder is reserved if a future release adds file-based vector stores.

## LanceDB (optional dependency)

The project lists `@lancedb/lancedb` as an **optional** npm dependency for teams that want to experiment with LanceDB-backed indexes in the main process. The shipping app does not require it; embeddings are fully functional without LanceDB.

To adopt LanceDB in a follow-up change you would typically:

1. Open or create a table under `workspaces/<id>/vectors/` from the main process only.
2. Keep SQLite as the source of truth for metadata; sync or migrate embeddings as needed.
3. Add `@lancedb/lancedb` to webpack **externals** (or load it only from Node) so native bindings are not bundled into the renderer.

## Model notes

Not every Ollama chat model supports embeddings. If semantic search or background embedding fails, check Ollama logs and try a model known to support embeddings, or rely on keyword search only.
