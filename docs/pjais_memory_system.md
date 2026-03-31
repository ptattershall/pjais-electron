# PJais -- Business Memory System

PJais uses a **controlled memory system** to ensure AI only remembers
relevant business information.

## Memory Types

Examples:

Brand Voice\
Offer\
Ideal Customer Profile\
Pricing\
Business Decisions\
Policies\
Standard Operating Procedures\
Client Information

Memories are structured records stored in SQLite.

## Memory Commit Flow

1. AI detects important information.
2. AI suggests saving it.
3. User reviews the suggestion.
4. User approves or edits.
5. Memory is saved.

Each memory record includes:

- type
- description
- source
- creation date

## Embeddings

When a memory is saved (and when the Ollama runtime can embed):

1. Text is embedded via the local model API (e.g. Ollama `/api/embeddings`).
2. The vector is stored in the **per-workspace SQLite** `embeddings` table
   (`vector_json`), keyed to the memory row by `entity_type` / `entity_id`.
3. Semantic retrieval uses cosine similarity over those stored vectors
   together with keyword search where applicable.

Details, fallbacks, and the reserved `vectors/` folder are in
[VECTORS.md](./VECTORS.md). Optional **LanceDB** is not required for this
flow in v0.1.

## Retrieval Rules

Default behavior:

- only retrieve from the current workspace
- prioritize recent or high relevance records
- include links to the source record

## Safety

The system prevents:

- cross‑workspace memory leaks
- unrelated context injection

Users remain in control of what information is stored.
