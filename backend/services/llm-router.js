// backend/services/llm-router.js
//
// Intelligent model router.
//
// Selects the best LLM provider for each request based on:
//   • User tier (free → local only, personal → mid-tier API, business → premium API)
//   • Query type (chat, translation, code, document)
//   • Monthly API spend budget per user
//
// Every provider path falls back to local Ollama on failure, so the system
// never goes dark because an external key is missing or rate-limited.

import process from 'node:process';
import { streamChat as ollamaStream } from './qwen.js';

// ─── Pricing (USD per 1 K tokens, blended input+output estimate) ────────────

const COST_PER_1K = {
  ollama:          0,
  deepseek:        0.00070,   // DeepSeek V3  — $0.27 in / $1.10 out per 1M
  'qwen-dashscope':0.00080,   // Qwen-Plus    — $0.40 in / $1.20 out per 1M
  'gpt4o-mini':    0.00038,   // GPT-4o Mini  — $0.15 in / $0.60 out per 1M
  'claude-haiku':  0.00240,   // Haiku 4.5    — $0.80 in / $4.00 out per 1M
  'gemini-flash':  0.00019,   // Gemini Flash — $0.075 in / $0.30 out per 1M
};

// ─── Monthly spend caps (USD per user) ────────────────────────────────────

export const BUDGET = {
  free:     0,
  personal: 2.00,
  business: 20.00,
};

// ─── Routing table ─────────────────────────────────────────────────────────
//
// Priority order per (tier, queryType). The router walks the array and picks
// the first entry whose API key is set in the environment.

const ROUTES = {
  free: {
    chat:        ['ollama'],
    translation: ['ollama'],
    code:        ['ollama'],
    document:    ['ollama'],
  },
  personal: {
    chat:        ['deepseek',      'gemini-flash',     'gpt4o-mini',     'qwen-dashscope', 'ollama'],
    translation: ['qwen-dashscope','deepseek',         'gemini-flash',   'gpt4o-mini',     'ollama'],
    code:        ['deepseek',      'gpt4o-mini',       'gemini-flash',   'ollama'],
    document:    ['deepseek',      'gemini-flash',     'gpt4o-mini',     'ollama'],
  },
  business: {
    chat:        ['claude-haiku',  'gpt4o-mini',       'deepseek',       'ollama'],
    translation: ['qwen-dashscope','claude-haiku',      'gpt4o-mini',     'ollama'],
    code:        ['deepseek',      'claude-haiku',      'gpt4o-mini',     'ollama'],
    document:    ['claude-haiku',  'gpt4o-mini',       'deepseek',       'ollama'],
  },
};

// ─── Query classifier ──────────────────────────────────────────────────────

const TRANSLATION_RE = /\b(ترجم|translate|tradui[st]|translation)\b/i;
const CODE_RE        = /\b(code|كود|برمج|function|script|برنامج|api|خوارزمية)\b/i;

export function classifyQuery(messages) {
  const last = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  if (TRANSLATION_RE.test(last)) return 'translation';
  if (CODE_RE.test(last))        return 'code';
  if (messages.map(m => m.content).join(' ').length > 2000) return 'document';
  return 'chat';
}

// ─── Model availability check ──────────────────────────────────────────────

const ENV_KEY = {
  deepseek:          'DEEPSEEK_API_KEY',
  'qwen-dashscope':  'DASHSCOPE_API_KEY',
  'gpt4o-mini':      'OPENAI_API_KEY',
  'claude-haiku':    'ANTHROPIC_API_KEY',
  'gemini-flash':    'GEMINI_API_KEY',
  ollama:            null,  // always available
};

function isAvailable(modelId) {
  const key = ENV_KEY[modelId];
  return key === null || !!process.env[key];
}

export function selectModel(tier, queryType, monthlySpendUSD = 0) {
  const budget = BUDGET[tier] ?? 0;
  const overBudget = monthlySpendUSD >= budget && budget > 0;

  const candidates = (ROUTES[tier] ?? ROUTES.free)[queryType] ?? ['ollama'];
  for (const id of candidates) {
    if (overBudget && id !== 'ollama') continue;
    if (isAvailable(id)) return id;
  }
  return 'ollama';
}

// ─── Provider streaming implementations ───────────────────────────────────

async function* streamOpenAI({ baseUrl, model, apiKey, messages }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true, max_tokens: 2048 }),
  });

  if (!res.ok || !res.body) throw new Error(`${model} HTTP ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const raw of block.split('\n')) {
        if (!raw.startsWith('data:')) continue;
        const payload = raw.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const chunk = JSON.parse(payload)?.choices?.[0]?.delta?.content ?? '';
          if (chunk) yield chunk;
        } catch { /* malformed SSE line */ }
      }
    }
  }
}

async function* streamAnthropic({ model, apiKey, messages }) {
  const system  = messages.find(m => m.role === 'system');
  const userMsgs = messages.filter(m => m.role !== 'system');

  const body = { model, max_tokens: 2048, stream: true, messages: userMsgs };
  if (system) body.system = system.content;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) throw new Error(`claude HTTP ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let type = '';
      for (const raw of block.split('\n')) {
        if (raw.startsWith('event:')) { type = raw.slice(6).trim(); continue; }
        if (type !== 'content_block_delta' || !raw.startsWith('data:')) continue;
        try {
          const chunk = JSON.parse(raw.slice(5).trim())?.delta?.text ?? '';
          if (chunk) yield chunk;
        } catch { /* skip */ }
      }
    }
  }
}

async function* streamGemini({ model, apiKey, messages }) {
  // Collapse messages into a single prompt for Gemini's simpler content format
  const text = messages
    .filter(m => m.role !== 'system')
    .map(m => (m.role === 'user' ? m.content : `[مساعد]: ${m.content}`))
    .join('\n\n');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { maxOutputTokens: 2048 },
      }),
    }
  );

  if (!res.ok || !res.body) throw new Error(`gemini HTTP ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const raw of block.split('\n')) {
        if (!raw.startsWith('data:')) continue;
        try {
          const obj   = JSON.parse(raw.slice(5).trim());
          const chunk = obj?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (chunk) yield chunk;
        } catch { /* skip */ }
      }
    }
  }
}

// ─── Dispatch table ────────────────────────────────────────────────────────

function dispatchStream(modelId, messages) {
  switch (modelId) {
    case 'deepseek':
      return streamOpenAI({
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY,
        messages,
      });
    case 'qwen-dashscope':
      return streamOpenAI({
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'qwen-plus',
        apiKey: process.env.DASHSCOPE_API_KEY,
        messages,
      });
    case 'gpt4o-mini':
      return streamOpenAI({
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
        messages,
      });
    case 'claude-haiku':
      return streamAnthropic({
        model: 'claude-haiku-4-5-20251001',
        apiKey: process.env.ANTHROPIC_API_KEY,
        messages,
      });
    case 'gemini-flash':
      return streamGemini({
        model: 'gemini-2.5-flash',
        apiKey: process.env.GEMINI_API_KEY,
        messages,
      });
    default:
      return ollamaStream(messages);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Stream a chat completion using the best available model for the user's context.
 *
 * @param {Array<{role:string, content:string}>} messages
 * @param {{ tier?: 'free'|'personal'|'business', monthlySpendUSD?: number }} opts
 * @returns {AsyncIterable<string>}
 */
export async function* routeChat(messages, { tier = 'free', monthlySpendUSD = 0 } = {}) {
  const queryType = classifyQuery(messages);
  const modelId   = selectModel(tier, queryType, monthlySpendUSD);

  console.info(`[router] tier=${tier} type=${queryType} → ${modelId}`);

  if (modelId === 'ollama') {
    yield* ollamaStream(messages);
    return;
  }

  try {
    yield* dispatchStream(modelId, messages);
  } catch (err) {
    console.warn(`[router] ${modelId} failed (${err.message}) — falling back to ollama`);
    yield* ollamaStream(messages);
  }
}

export { COST_PER_1K };
