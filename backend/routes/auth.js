// Zidnni/backend/routes/auth.js
// Maqasid: حفظ العقل
//
// POST /api/auth — session bootstrap.
//
// Phase 1 has no real authentication. This endpoint simply mints a fresh
// conversationId so the frontend has something stable to send on every
// /api/chat request. Phase 2 will add user identity (passkey or email
// magic link) without changing the wire shape of this response.
//
// Contract:
//   Request  (JSON): {}
//   Response (JSON): { conversationId: string, createdAt: number }

import express from 'express';
import { randomUUID } from 'node:crypto';

const router = express.Router();

router.post('/', (_req, res) => {
  res.json({
    conversationId: randomUUID(),
    createdAt: Date.now(),
  });
});

export default router;
