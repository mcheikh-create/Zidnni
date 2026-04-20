// Zidnni/backend/services/qwen.js
// Maqasid: حفظ العقل
//
// Qwen3 client. Tries Ollama first (local, sovereign), falls back to
// OpenRouter when Ollama is unreachable. Both paths stream tokens — the
// caller receives an async iterable of text chunks.
//
// This module is deliberately small. If you are tempted to add provider
// abstractions, retry policies, or a request queue here — don't. Put them
// in a layer above, and keep this file about the two providers we actually
// use and the streaming contract we expose.

import process from 'node:process';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:32b';

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'qwen/qwen3-32b';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

// ---------------------------------------------------------------------------
// Health check — used to decide whether to prefer Ollama for this request.
// ---------------------------------------------------------------------------

/**
 * Check whether Ollama is reachable. Cached for 10 seconds so we don't
 * hammer the local socket on every chat turn.
 */
let ollamaHealthCache = { ok: false, checkedAt: 0 };
const OLLAMA_HEALTH_TTL_MS = 10_000;

async function isOllamaReachable() {
  const now = Date.now();
  if (now - ollamaHealthCache.checkedAt < OLLAMA_HEALTH_TTL_MS) {
    return ollamaHealthCache.ok;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    ollamaHealthCache = { ok: res.ok, checkedAt: now };
    return res.ok;
  } catch {
    ollamaHealthCache = { ok: false, checkedAt: now };
    return false;
  }
}

// ---------------------------------------------------------------------------
// Ollama streaming — /api/chat with stream=true returns ndjson lines.
// ---------------------------------------------------------------------------

async function* streamFromOllama(messages) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: true }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Ollama responded ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        const chunk = obj?.message?.content ?? '';
        if (chunk) yield chunk;
        if (obj.done) return;
      } catch {
        // Malformed line — skip. Ollama ndjson is normally clean.
      }
    }
  }
}

// ---------------------------------------------------------------------------
// OpenRouter streaming — OpenAI-compatible SSE (data: {...}\n\n).
// ---------------------------------------------------------------------------

async function* streamFromOpenRouter(messages) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter fallback requested but OPENROUTER_API_KEY is unset');
  }
  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://github.com/mcheikh-create/Zidnni',
      'X-Title': 'Zidnni',
    },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages, stream: true }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter responded ${res.status}: ${text.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const event = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const raw of event.split('\n')) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const obj = JSON.parse(payload);
          const chunk = obj?.choices?.[0]?.delta?.content ?? '';
          if (chunk) yield chunk;
        } catch {
          // Ignore malformed SSE chunk.
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

/**
 * Stream a chat completion from Qwen3.
 *
 * Prefers Ollama when reachable; otherwise falls back to OpenRouter.
 *
 * @param {Array<{role:'system'|'user'|'assistant', content:string}>} messages
 * @returns {AsyncIterable<string>} — text chunks in order.
 */
export async function* streamChat(messages) {
  const useOllama = await isOllamaReachable();
  if (useOllama) {
    try {
      yield* streamFromOllama(messages);
      return;
    } catch (err) {
      // Fall through to OpenRouter.
      console.warn('[qwen] Ollama stream failed, falling back to OpenRouter:', err.message);
    }
  }
  yield* streamFromOpenRouter(messages);
}

/**
 * Non-streaming convenience — accumulates the full reply.
 *
 * @param {Array<{role:'system'|'user'|'assistant', content:string}>} messages
 * @returns {Promise<string>}
 */
export async function chat(messages) {
  let out = '';
  for await (const chunk of streamChat(messages)) out += chunk;
  return out;
}

export const _internal = {
  isOllamaReachable,
  streamFromOllama,
  streamFromOpenRouter,
};
