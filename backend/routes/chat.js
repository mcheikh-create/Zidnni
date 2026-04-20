// Zidnni/backend/routes/chat.js
// Maqasid: حفظ العقل
//
// POST /api/chat — streaming chat endpoint.
//
// Contract:
//   Request  (JSON):  { conversationId: string, message: string, lang?: 'ar'|'fr'|'en' }
//   Response (SSE):   event: token   data: "<chunk>"
//                     event: done    data: "{ok:true}" | "{ok:false, reason:'...'}"
//
// Flow:
//   1. Append user message to memory.
//   2. Build messages array = [identity-system-prompt] + full history.
//   3. Stream from Qwen3 via services/qwen.js.
//   4. As chunks arrive, forward as SSE 'token' events and buffer the full reply.
//   5. After stream ends, verify the full reply with req.identity.verify().
//      If it fails, emit a 'done' event with ok:false and do NOT append the
//      tainted reply to memory.

import express from 'express';
import * as memory from '../services/memory.js';
import { streamChat } from '../services/qwen.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { conversationId, message, lang } = req.body ?? {};

  if (!conversationId || typeof message !== 'string' || message.length === 0) {
    return res
      .status(400)
      .json({ error: 'conversationId and non-empty message are required' });
  }

  const userLanguage = lang === 'fr' || lang === 'en' ? lang : 'ar';

  memory.append(conversationId, { role: 'user', content: message });

  const systemPrompt = req.identity.buildSystemPrompt({ userLanguage });
  const messages = [
    systemPrompt,
    ...memory.history(conversationId).map(({ role, content }) => ({ role, content })),
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const writeEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
  };

  let fullReply = '';
  try {
    for await (const chunk of streamChat(messages)) {
      fullReply += chunk;
      writeEvent('token', chunk);
    }
  } catch (err) {
    writeEvent('done', { ok: false, reason: 'upstream-error', detail: err.message });
    res.end();
    return;
  }

  const verdict = req.identity.verify(fullReply);
  if (!verdict.ok) {
    writeEvent('done', {
      ok: false,
      reason: `identity-drift:${verdict.reason}`,
      match: verdict.match,
    });
    res.end();
    return;
  }

  memory.append(conversationId, { role: 'assistant', content: fullReply });
  writeEvent('done', { ok: true });
  res.end();
});

export default router;
