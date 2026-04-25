# Zidnni — Master Context for Claude

## Project Identity
Zidnni (زدني) — Arabic-first AI assistant for Mauritania
Founder: محيي الدين
Mission: حفظ العقل — preservation of the intellect
Based: Nouadhibou, Mauritania

## The AI Fleet
- Alienware Area-51: RTX 5080, 16GB VRAM, 32GB RAM, Intel Core Ultra 7
  → Hermes Prime (builder + inference)
  → qwen3:32b + qwen3:8b via Ollama
  → Claude Code (senior engineer)
  → Zidnni web app running locally

- Mac Studio M3 Ultra: 512GB RAM, 80-core GPU
  → Hermes Scholar (fine-tuning + research)
  → MLX fine-tuning platform
  → Gemma4:26b for large model work
  → Reserved: DO NOT use for Zidnni chat

- MacBook M3: Personal machine
  → Hermes Personal (email, calendar, personal tasks)
  → Gemini Flash brain

- Old Mac: Business operations machine
  → Hermes Business (COO role)
  → Client management, finance, marketing

## Chain of Command
- محيي الدين = Visionary & CEO
- Claude (claude.ai) = Gatekeeper & Orchestrator (STATELESS — needs this file every session)
- Hermes (Alienware WSL2) = Autonomous Agent, WhatsApp+Telegram connected
- Claude Code = Senior Engineer, builds complex code
- Hermes Gateway: PID varies, running via WSL2, DeepSeek V3 brain

## Zidnni App — Current State
Repository: https://github.com/mcheikh-create/Zidnni
Local: ~/Zidnni on Alienware WSL2

### Backend (100% complete)
- Node.js 22, Express, WebSocket
- SQLite database (zidnni.db) — users, usage, subscriptions
- JWT auth, phone+OTP login (dev OTP: 1234)
- Rate limiting: Free=20msg/day, Personal=unlimited, Business=unlimited
- Identity middleware (currently disabled for testing)
- SSE streaming chat

### Frontend (100% complete)
- React 18 + Vite, RTL-first Arabic
- Routes: / (Landing), /auth, /chat, /dashboard
- Arabic keyboard component
- Model selector dropdown (test mode)
- Markdown rendering
- Languages: AR/FR/EN

### Subscription Tiers
- Free (زدني الحر): 0 MRU, 20 msg/day, local model
- Personal (زدني الشخصي): 500 MRU/$9.99, unlimited, DeepSeek V3
- Business (زدني الأعمال): 2000 MRU/$49, unlimited, Claude Haiku

### Model Router (backend/services/llm-router.js)
- Free → qwen3:8b (Ollama local, zero cost)
- Personal → DeepSeek V3 (api.deepseek.com, $0.00024/q)
- Business → Claude Haiku 4.5 ($0.00122/q)
- Fallback → Ollama on any API failure

### API Keys in ~/Zidnni/.env
- DEEPSEEK_API_KEY: set ✅
- ANTHROPIC_API_KEY: set ✅
- GEMINI_API_KEY: set ✅
- STRIPE keys: placeholder (not yet configured)

### Pending
- Deploy to public URL (research done, not yet deployed)
- Bankily/Masrawi payment integration
- WhatsApp Wakeel (Phase 2)
- Voice input (Whisper)

## Hermes Configuration
- Installation: WSL2 at ~/.hermes/
- Gateway: running as background process
- Model: deepseek-chat via api.deepseek.com/v1
- Context: 65,536 tokens
- Platforms: Telegram ✅, WhatsApp ✅
- Dashboard: http://localhost:7123
- SOUL.md: C:\Users\MOHIY\AppData\Local\hermes\SOUL.md
- Config: C:\Users\MOHIY\AppData\Local\hermes\config.yaml
- terminal.require_approval: never

## Hassania Fine-Tuning Ecosystem

### GitHub Repos
- https://github.com/mcheikh-create/hassania-dataset (4,419 entries)
- https://github.com/mcheikh-create/hassania-research (AutoResearch engine)
- https://github.com/mcheikh-create/hassania-dialect-engine (Simula pipeline)
- Submodules in Zidnni: finetune/ (hassania-qwen-finetune) and data-pipeline/ (hassania-data-pipeline)

### Dataset
- Location: ~/hassania-dataset/ on Alienware WSL2
- Raw entries: 4,419 across 17 JSONL files
- Clean dataset: ~/hassania-dataset/clean_dataset.jsonl (1,664 unique entries)
- Train split: ~/hassania-dataset/train.jsonl (1,497 entries)
- Val split: ~/hassania-dataset/val.jsonl (167 entries)
- HDRP dataset: ~/Zidnni/finetune/hdrp/data/processed/exports/
  - dapt_hassaniya_v2.jsonl: 6,478 records
  - sft_hassaniya_v2.jsonl: 10,668 records (21,336 SFT turns)
  - eval_hassaniya_v2.jsonl: 593 records
- Baseline dialect_hit_rate: 0.2000 (untuned qwen3:8b)

### Fine-Tuning — BLOCKED, NEEDS ONE FIX
- Script: ~/Zidnni/finetune/hdrp/pipeline/finetune/qwen_finetune.py
- Model: Qwen/Qwen2.5-1.5B-Instruct (cached locally, loads in ~2s)
- Hardware: RTX 5080, 16GB VRAM — PyTorch nightly 2.12.0.dev+cu128 ✅
- Data: sft_hassaniya_v2.jsonl (10,668 samples)
- Fix 1 DONE: line 235, tokenizer → processing_class
- Fix 2 NEEDED: SFTTrainer also rejects dataset_text_field and max_seq_length
  → Root cause: trl installed version is newer than script
  → Solution A: pip install trl==0.7.4 --break-system-packages
  → Solution B: replace TrainingArguments with SFTConfig, remove those args
- LoRA config: rank=16, alpha=32, target all projection layers, 1.18% trainable
- Estimated training time once running: ~2-3 hours for 1 epoch on RTX 5080

### AutoResearch Engine (~/autoresearch/)
- night.sh: autonomous loop 11pm–6am, auto-commits on improvement
- program.md: Hassania research directions for Claude Code agent
- MEMORY.md: persistent experiment log
- report.py: sends Telegram morning report (chat_id: 8082672040)
- Cron: Mac launchd plists in ~/autoresearch/cron/ (needs REPLACE_USERNAME)
- WSL2 fallback: val_bpb=-1.0 (sentinel, not a crash), dialect_hit_rate uses Ollama

### The Architecture
- AutoResearch ratchet: ~100 experiments/night, git commit only improvements
- Simula methodology: dual-critic, complexifier, diacritics module
- Hermes+Honcho: persistent memory across all sessions
- Mac Studio: MLX fine-tuning target platform

### Diacritics Module
- Purpose: TTS/STT foundation for all dialects
- HassaniaDiacritizer: handles ق→گ, ث→t/s, French loanwords
- Dual-Critic + Critic C (diacritics validator)
- DIALECT_REGISTRY: add new dialects with one line

## Technical Environment — Alienware WSL2
- Python: 3.12 (system), pip at ~/.local/bin/pip
- PyTorch: 2.12.0.dev20260408+cu128 (nightly, sm_120 Blackwell support ✅)
- torchvision/torchaudio: UNINSTALLED (incompatible with nightly, not needed for text)
- CUDA: 13.0 driver, RTX 5080 sm_120
- Ollama: running at http://172.25.128.1:11434
  - Models: qwen3:8b, qwen3:32b, gemma4:26b
  - Note: use think:false in API calls (qwen3 uses extended thinking by default)
- datasets library: 4.8.4 (installed at ~/.local/lib/python3.12/)
- HuggingFace: model downloads work; dataset downloads blocked on this network

## Community Outreach
- r/Mauritania identified as best immediate channel
- أبناء موريتانيا في المهجر FB group (10-20K members)
- University of Nouakchott: info@univ-nkc.mr / +222 45 24 40 40
- ELAR archive: possible existing Hassania recordings

## Key Decisions Made
1. qwen3:8b = Zidnni free tier (best local Arabic, beats aya:35b)
2. DeepSeek V3 = personal tier + Hermes brain (fastest, cheapest)
3. Claude Haiku = business tier (best quality)
4. Gemma4:26b = Mac Studio future (too slow on Alienware)
5. Identity filter disabled until fine-tune gives Zidnni its identity
6. Open WebUI = admin testing tool only (not user-facing)
7. Fine-tune on Alienware RTX 5080 now, Mac Studio MLX later
8. trl must be pinned to 0.7.4 OR script updated to use SFTConfig API

## How to Start a New Claude Session
1. Share this CLAUDE.md with Claude at the start of every conversation
2. Claude will be immediately up to date
3. Say: "Read CLAUDE.md and continue as Gatekeeper/Orchestrator"

## The Vision
Zidnni is not just a chat app. It is:
- The sovereign AI infrastructure for Mauritania
- The first AI that truly speaks Hassania
- A four-machine autonomous AI operation
- A self-improving dialect engine that gets better every night
- A business with three subscription tiers
- A cultural preservation project for حفظ العقل

Built with Ihsan standard: as if Allah sees every commit.
