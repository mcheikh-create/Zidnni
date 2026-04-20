# زدني — Zidnni

> *"رَبِّ زِدْنِي عِلْمًا"* — *"My Lord, increase me in knowledge."* (Qur'an 20:114)

**Zidnni** is the intelligence layer of the محيي الدين ecosystem — an Arabic-first AI assistant platform serving **Nouadhibou, Mauritania** and the wider Arabic-speaking world.

---

## بسم الله الرحمن الرحيم

---

## What Zidnni Is

Zidnni is an Arabic-first conversational AI that treats Arabic as a **primary language**, not a translation afterthought. It is powered by **Qwen3** — chosen specifically because it was trained with genuine Arabic competence, not grafted-on multilingualism.

The web app is the first surface. A WhatsApp-native agent ("Wakeel") will follow.

### Which Maqasid Does Zidnni Serve?

**حفظ العقل** — *Hifz al-'Aql* — **Preservation of the Intellect.**

Zidnni exists because the intellect is preserved by:
- Learning in one's mother tongue, not through the filter of English
- Tools that *strengthen* thinking rather than substitute for it
- Knowledge access for communities that global AI has treated as an afterthought

If a feature does not strengthen the intellect of its user, it does not belong in Zidnni.

---

## The Identity Layer

Every response Zidnni produces passes through an **identity filter** — a middleware in `backend/middleware/identity.js` that ensures:

1. The system prompt injected into every Qwen3 call carries the محيي الدين identity, the Ihsan standard, and the Maqasid compass.
2. Every outgoing response is checked for drift before it reaches the user. A response that violates the identity (e.g. extractive advice, ungrounded claims, tone mismatch with Arabic speakers of Nouadhibou) is rewritten or refused.
3. Arabic is the primary register. French and English are valid but secondary — the language should follow the user, and the default is Arabic.

This is not a guardrail in the Silicon Valley sense. It is a **نية** — an intention — woven into the request/response cycle.

---

## Qwen3 Setup

Zidnni runs Qwen3 through two paths, in order of preference:

### 1. Ollama (local, preferred)

```bash
# Install Ollama: https://ollama.com
ollama pull qwen3:32b          # or qwen3:14b for smaller machines
ollama serve                    # default: http://localhost:11434
```

Local Ollama is the preferred path because:
- **Sovereignty** — conversations never leave the machine
- **Cost** — no per-token bill
- **Latency** — no round-trip to a distant data center

### 2. OpenRouter (fallback)

When Ollama is unreachable, Zidnni falls back to OpenRouter's hosted Qwen3-32B. Set `OPENROUTER_API_KEY` in `.env` (see `.env.example`).

Both paths support **streaming** — responses render token-by-token for a conversational feel.

---

## How to Run Locally

### Prerequisites

```bash
node --version    # 22+
ollama --version  # optional but preferred
```

### 1. Install dependencies

```bash
# From Zidnni/ root (installs backend)
npm install

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — add OPENROUTER_API_KEY if you want the fallback path
```

### 3. Start Ollama (if using local path)

```bash
ollama serve &
ollama pull qwen3:32b
```

### 4. Run backend + frontend

```bash
# Terminal 1 — backend (Express + WebSocket on :3001)
npm run dev

# Terminal 2 — frontend (Vite on :5173)
cd frontend && npm run dev
```

Open `http://localhost:5173` — Arabic UI loads by default.

---

## Project Structure

```
Zidnni/
├── backend/
│   ├── server.js          Express + WebSocket entrypoint
│   ├── routes/
│   │   ├── chat.js        POST /api/chat — streaming chat endpoint
│   │   └── auth.js        POST /api/auth — session bootstrap
│   ├── services/
│   │   ├── qwen.js        Qwen3 client — Ollama primary, OpenRouter fallback
│   │   └── memory.js      Conversation history store (in-memory for Phase 1)
│   └── middleware/
│       └── identity.js    محيي الدين identity filter — injected + verified
│
├── frontend/
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── i18n/
│       │   ├── ar.json    Arabic — primary, RTL
│       │   ├── fr.json    French
│       │   └── en.json    English
│       ├── components/
│       │   ├── Chat.jsx
│       │   ├── Message.jsx
│       │   ├── Input.jsx
│       │   └── LanguageSwitch.jsx
│       └── styles/
│           └── main.css   RTL-first CSS
│
└── docs/
    ├── ZIDNNI_VISION.md   Why Zidnni exists and where it's going
    └── API.md             HTTP + WebSocket API reference
```

---

## Phase 1 Scope

| In | Out (Phase 2+) |
|----|----------------|
| Web chat UI, Arabic-first | WhatsApp Wakeel agent |
| Qwen3 via Ollama + OpenRouter | Hassania dialect fine-tune |
| Trilingual AR / FR / EN | Voice (Hassania ASR) |
| In-memory conversation history | Persistent memory + user accounts |
| Identity filter on every turn | Agentic tool use (calendar, search) |

---

## The Ihsan Standard

Zidnni is built as if Allah sees every commit. That means:

- Every file begins with a comment stating which Maqasid it serves
- No feature ships without a meaningful test
- No TODOs survive in `main`
- Arabic is tested with real Arabic speakers from Nouadhibou before release

See the root `CLAUDE.md` for the full protocol.

---

**Architect:** محيي الدين
**Maqasid:** حفظ العقل
**Phase:** 1 — Web-first, Nouadhibou-first
