// Zidnni/backend/server.js
// Maqasid: حفظ العقل
//
// Express + WebSocket entrypoint.
//
// - HTTP surface mounts /api/auth and /api/chat (see routes/).
// - WebSocket surface on path /ws — reserved for Phase 2 real-time features
//   (typing indicators, multi-device sync). Phase 1 just echoes a welcome
//   frame so clients can verify reachability.
// - Every request passes through identityMiddleware so routes can call
//   req.identity.buildSystemPrompt() and req.identity.verify() without
//   importing the module directly.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer } from 'ws';

import identityMiddleware from './middleware/identity.js';
import chatRoute from './routes/chat.js';
import authRoute from './routes/auth.js';
import subscriptionRoute from './routes/subscription.js';
import userRoute from './routes/user.js';
import './db.js'; // trigger migrations on startup

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(identityMiddleware);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'zidnni',
    maqasid: 'حفظ العقل',
    time: Date.now(),
  });
});

app.use('/api/auth', authRoute);
app.use('/api/chat', chatRoute);
app.use('/api/subscription', subscriptionRoute);
app.use('/api/user', userRoute);

app.use((err, _req, res, _next) => {
  console.error('[zidnni] unhandled error:', err);
  res.status(500).json({ error: 'internal_error', detail: err.message });
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'hello', service: 'zidnni' }));
  ws.on('message', (raw) => {
    // Phase 1: echo. Phase 2 will route to real-time handlers.
    ws.send(JSON.stringify({ type: 'echo', payload: raw.toString() }));
  });
});

server.listen(PORT, () => {
  console.log(`[zidnni] HTTP  listening on :${PORT}`);
  console.log(`[zidnni] WS    listening on :${PORT}/ws`);
});
