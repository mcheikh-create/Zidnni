#!/usr/bin/env node
// scripts/test-models.js
// Run with: node scripts/test-models.js
// Add API keys to .env before running.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dir = dirname(fileURLToPath(import.meta.url));

// Parse .env from project root without requiring dotenv in this script
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dir, '../.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch { /* rely on real env vars */ }
}
loadEnv();

// ─── Model registry ────────────────────────────────────────────────────────

const MODELS = [
  {
    id: 'deepseek',
    name: 'DeepSeek V3',
    model: 'deepseek-chat',
    format: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    // Pricing per 1K tokens (USD) — cache-miss rates
    pricing: { input: 0.00027, output: 0.0011 },
  },
  {
    id: 'qwen-dashscope',
    name: 'Qwen-Plus (DashScope)',
    model: 'qwen-plus',
    format: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    pricing: { input: 0.0004, output: 0.0012 },
  },
  {
    id: 'claude-haiku',
    name: 'Claude Haiku 4.5',
    model: 'claude-haiku-4-5-20251001',
    format: 'anthropic',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    pricing: { input: 0.0008, output: 0.004 },
  },
  {
    id: 'gpt4o-mini',
    name: 'GPT-4o Mini',
    model: 'gpt-4o-mini',
    format: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    pricing: { input: 0.00015, output: 0.0006 },
  },
  {
    id: 'gemini-flash',
    name: 'Gemini 2.0 Flash',
    model: 'gemini-2.0-flash',
    format: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKeyEnv: 'GEMINI_API_KEY',
    pricing: { input: 0.000075, output: 0.0003 },
  },
];

// ─── Test questions ────────────────────────────────────────────────────────

const QUESTIONS = [
  'ما هي عاصمة موريتانيا؟',
  'ما هي اللهجة الحسانية وأين تُتكلم؟',
  'اشرح لي كيف أصطاد السمك في نواذيبو',
  'ترجم هذه الجملة للفرنسية: أريد شراء سمك طازج',
  'ما هو الفرق بين الفصحى والحسانية؟',
];

// ─── API callers ───────────────────────────────────────────────────────────

async function callOpenAI({ baseUrl, model, apiKey }, prompt) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 120)}`);
  }
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

async function callAnthropic({ model, apiKey }, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 120)}`);
  }
  const data = await res.json();
  return {
    text: data.content?.[0]?.text ?? '',
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

async function callGemini({ baseUrl, model, apiKey }, prompt) {
  const res = await fetch(
    `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 512 },
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 120)}`);
  }
  const data = await res.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

async function callModel(cfg, prompt) {
  const apiKey = process.env[cfg.apiKeyEnv];
  if (!apiKey) throw new Error(`${cfg.apiKeyEnv} not set`);

  const t0 = Date.now();
  let result;

  switch (cfg.format) {
    case 'openai':    result = await callOpenAI(   { ...cfg, apiKey }, prompt); break;
    case 'anthropic': result = await callAnthropic({ ...cfg, apiKey }, prompt); break;
    case 'gemini':    result = await callGemini(   { ...cfg, apiKey }, prompt); break;
    default: throw new Error(`Unknown format: ${cfg.format}`);
  }

  const ms    = Date.now() - t0;
  const costUSD =
    (result.inputTokens  / 1000) * cfg.pricing.input +
    (result.outputTokens / 1000) * cfg.pricing.output;

  return { ...result, ms, costUSD };
}

// ─── Formatting helpers ────────────────────────────────────────────────────

const W = 100;
const HR  = '─'.repeat(W);
const DHR = '═'.repeat(W);

function clip(str, max) {
  const s = str.replace(/\n+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
function padR(s, n) { return String(s).padStart(n); }
function padL(s, n) { return String(s).padEnd(n); }

function printResults(allResults) {
  process.stdout.write('\n\n');
  console.log(DHR);
  console.log('  ZIDNNI MODEL BENCHMARK — Arabic + Mauritanian Knowledge');
  console.log(DHR);

  for (const { cfg, questions } of allResults) {
    process.stdout.write(`\n▶  ${cfg.name}\n`);
    console.log(HR);

    let totalMs = 0, totalCost = 0, answered = 0;
    for (let i = 0; i < questions.length; i++) {
      const r = questions[i];
      if (r.error) {
        console.log(`  Q${i + 1}  ❌  ${r.error}`);
        continue;
      }
      totalMs   += r.ms;
      totalCost += r.costUSD;
      answered++;
      console.log(`  Q${i + 1}  ${QUESTIONS[i]}`);
      console.log(`       ${clip(r.text, 88)}`);
      console.log(`       ⏱  ${padR(r.ms + 'ms', 7)}  |  🔢 ${r.inputTokens}in+${r.outputTokens}out  |  💰 $${r.costUSD.toFixed(5)}`);
    }

    if (answered > 0) {
      const avg = Math.round(totalMs / answered);
      console.log(`\n  ── avg ${avg}ms/question  |  total $${totalCost.toFixed(5)} for ${answered}/${QUESTIONS.length} questions`);
    }
  }

  // ── Rankings
  process.stdout.write('\n\n');
  console.log(DHR);
  console.log('  RANKINGS');
  console.log(DHR);

  const ranked = allResults
    .map(({ cfg, questions }) => {
      const ok = questions.filter(q => !q.error);
      if (!ok.length) return null;
      return {
        name:      cfg.name,
        avgMs:     Math.round(ok.reduce((s, q) => s + q.ms, 0) / ok.length),
        totalCost: ok.reduce((s, q) => s + q.costUSD, 0),
        answered:  ok.length,
      };
    })
    .filter(Boolean);

  process.stdout.write('\n  By speed (avg ms / question):\n');
  [...ranked].sort((a, b) => a.avgMs - b.avgMs).forEach((r, i) =>
    console.log(`    ${i + 1}.  ${padL(r.name, 28)}  ${padR(r.avgMs + 'ms', 8)}`)
  );

  process.stdout.write('\n  By cost (total for all questions):\n');
  [...ranked].sort((a, b) => a.totalCost - b.totalCost).forEach((r, i) =>
    console.log(`    ${i + 1}.  ${padL(r.name, 28)}  $${r.totalCost.toFixed(5)}`)
  );

  process.stdout.write('\n  Value score (lower is better — cost × time):\n');
  [...ranked]
    .map(r => ({ ...r, score: r.totalCost * r.avgMs }))
    .sort((a, b) => a.score - b.score)
    .forEach((r, i) =>
      console.log(`    ${i + 1}.  ${padL(r.name, 28)}  score ${r.score.toFixed(6)}`)
    );

  process.stdout.write('\n\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔬  Zidnni Model Benchmark');
  console.log(`    ${MODELS.length} models  ×  ${QUESTIONS.length} questions\n`);

  const active = MODELS.filter(m => process.env[m.apiKeyEnv]);
  const skipped = MODELS.filter(m => !process.env[m.apiKeyEnv]);

  if (skipped.length) {
    console.log('⚠️   Skipping (no API key):');
    skipped.forEach(m => console.log(`     • ${m.name}  (${m.apiKeyEnv})`));
    process.stdout.write('\n');
  }

  if (!active.length) {
    console.error('❌  No API keys configured — add them to .env and re-run.');
    process.exit(1);
  }

  const allResults = [];

  for (const cfg of active) {
    console.log(`⏳  ${cfg.name}`);
    const questions = [];

    for (let i = 0; i < QUESTIONS.length; i++) {
      process.stdout.write(`    Q${i + 1} `);
      try {
        const r = await callModel(cfg, QUESTIONS[i]);
        process.stdout.write(`✓ ${r.ms}ms\n`);
        questions.push({ ...r, error: null });
      } catch (err) {
        process.stdout.write(`✗ ${err.message.slice(0, 60)}\n`);
        questions.push({ error: err.message });
      }
    }

    allResults.push({ cfg, questions });
  }

  printResults(allResults);
}

main().catch(err => { console.error(err); process.exit(1); });
