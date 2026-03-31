/**
 * Minimal Ollama HTTP client for the Electron main process.
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */

function getOllamaBaseUrl() {
  return (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '');
}

function abortAfter(ms) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  return { signal: ac.signal, cancel: () => clearTimeout(id) };
}

/**
 * @returns {Promise<{ ok: boolean, baseUrl: string, modelNames: string[], error?: string }>}
 */
async function ollamaHealth() {
  const baseUrl = getOllamaBaseUrl();
  const { signal, cancel } = abortAfter(4000);
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal });
    cancel();
    if (!res.ok) {
      return { ok: false, baseUrl, modelNames: [], error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const modelNames = Array.isArray(data.models)
      ? data.models.map((m) => m.name).filter(Boolean)
      : [];
    return { ok: true, baseUrl, modelNames };
  } catch (err) {
    cancel();
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, baseUrl, modelNames: [], error: message };
  }
}

function pickModel(modelNames, preferred) {
  const envModel = (process.env.PJAIS_OLLAMA_MODEL || preferred || '').trim();
  if (envModel && modelNames.includes(envModel)) {
    return envModel;
  }
  if (envModel) {
    return envModel;
  }
  if (modelNames.length > 0) {
    return modelNames[0];
  }
  return 'llama3.2';
}

/**
 * @param {string} baseUrl
 * @param {string} model
 * @param {{ role: string, content: string }[]} messages
 * @returns {Promise<string>}
 */
async function ollamaChat(baseUrl, model, messages) {
  const { signal, cancel } = abortAfter(120000);
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
      signal,
    });
    cancel();
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Ollama HTTP ${res.status}`);
    }
    const data = await res.json();
    const content = data?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new Error('Empty response from Ollama');
    }
    return content.trim();
  } catch (err) {
    cancel();
    throw err;
  }
}

/**
 * @param {string} baseUrl
 * @param {string} model
 * @param {string} input
 * @returns {Promise<number[]>}
 */
async function ollamaEmbed(baseUrl, model, input) {
  const text = String(input || '').trim();
  if (!text) {
    throw new Error('Empty embed input');
  }
  const { signal, cancel } = abortAfter(60000);
  try {
    const res = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: text,
      }),
      signal,
    });
    cancel();
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Ollama embed HTTP ${res.status}`);
    }
    const data = await res.json();
    const emb = data?.embedding;
    if (!Array.isArray(emb) || emb.length === 0) {
      throw new Error('Invalid embedding from Ollama');
    }
    return emb.map((x) => Number(x));
  } catch (err) {
    cancel();
    throw err;
  }
}

module.exports = {
  getOllamaBaseUrl,
  ollamaHealth,
  pickModel,
  ollamaChat,
  ollamaEmbed,
};
