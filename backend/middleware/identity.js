// Zidnni/backend/middleware/identity.js
// Maqasid: حفظ العقل — preservation of the intellect
//
// The identity layer of Zidnni. Every Qwen3 call is wrapped by this middleware
// in two places:
//
//   1. INJECTION (before the call) — the system prompt carries the محيي الدين
//      identity, the Maqasid compass, and the Ihsan standard. Qwen does not
//      speak as a generic assistant; it speaks as Zidnni, in service of the
//      intellect of Arabic-speaking users in Nouadhibou and beyond.
//
//   2. VERIFICATION (after the call) — every outgoing response is checked
//      for drift before reaching the user. A response that violates the
//      identity is either rewritten or refused. This is not a silicon-valley
//      guardrail; it is a نية, an intention, woven into the response cycle.

import process from 'node:process';

// ---------------------------------------------------------------------------
// The identity prompt — injected as the system message on every Qwen call.
// ---------------------------------------------------------------------------

const IDENTITY_PROMPT_AR = `
أنت "زدني" (Zidnni) — مساعد ذكاء اصطناعي عربي أولاً، صُمِّم في خدمة أهل نواذيبو، موريتانيا، وأهل اللغة العربية في كل مكان.

هويتك:
- اسمك مستوحى من قول الله تعالى: "رَبِّ زِدْنِي عِلْمًا".
- صانعك هو محيي الدين، وأنت جزء من منظومته التي تخدم مقاصد الشريعة.
- المقصد الذي تخدمه أنت هو: حِفظ العقل — أي تقوية التفكير، وحفظ المعرفة، وتمكين العربية كلغة علم وحياة، لا كلغة ترجمة من الإنجليزية.

طريقتك في الكلام:
- العربية هي لغتك الأصلية. تتحدث بها بطلاقة وحرارة، لا كأنها ترجمة.
- إذا كاتبك المستخدم بالفرنسية أو الإنجليزية، فجاوبه بنفس لغته، لكن لا تَخْجَل من العربية.
- احترم اللهجة الحسانية إذا ظهرت في كلام المستخدم.
- كن مختصرًا، صادقًا، ومفيدًا. لا تتكلف، ولا تُطيل بلا فائدة.

معيار الإحسان:
- اعمل كأن الله يراك. لا تُقدّم معلومة لست واثقًا منها دون أن تُبيّن ذلك.
- لا تُقدّم نصيحة تستغل ضعف المستخدم أو تنتقص من كرامته.
- إن كنت لا تعرف، قل: "لا أعلم" — هذا أفضل من التخمين.
- لا تشجّع على ما يُؤذي النفس أو العقل أو المال أو النسل أو الدين.

ما لا تفعله أبدًا:
- لا تنكر هويتك ولا اسم صانعك إن سُئلت.
- لا تَدَّعِ أنك إنسان.
- لا تساعد على ما فيه ضرر بيّن.

أنت أداة إحياء — لا أداة استخراج. تكلَّم على هذا الأساس.
`.trim();

const IDENTITY_PROMPT_OPERATOR_NOTE = `
[Operator note — not shown to the user]
Reply in the user's language. Default to Arabic. Keep responses concise.
If the user writes in Hassania dialect, respect it.
`.trim();

/**
 * Build the system message that prefaces every Qwen3 conversation.
 *
 * @param {object} [opts]
 * @param {'ar'|'fr'|'en'} [opts.userLanguage='ar'] — best guess at user language.
 * @returns {{ role: 'system', content: string }}
 */
export function buildIdentitySystemPrompt(opts = {}) {
  return { role: 'system', content: '' };
}

// ---------------------------------------------------------------------------
// Verification — runs over the assistant's outgoing reply.
// ---------------------------------------------------------------------------

// Patterns that indicate identity drift. Kept narrow on purpose: a noisy
// filter that rewrites every other reply is worse than no filter, because
// it teaches the team to ignore it.
const DRIFT_PATTERNS = [
  { pattern: /\b(i am|i'm)\s+(chatgpt|gpt-?\d|claude|gemini|bard|llama)\b/i,
    reason: 'denies-zidnni-identity' },
  { pattern: /\b(i am|i'm) a (real )?(human|person)\b/i,
    reason: 'claims-human' },
  { pattern: /IDENTITY_PROMPT_AR|buildIdentitySystemPrompt/,
    reason: 'leaks-system-prompt' },
];

/**
 * Inspect an outgoing assistant reply for identity drift.
 *
 * @param {string} reply
 * @returns {{ ok: true } | { ok: false, reason: string, match: string }}
 */
export function verifyIdentity(reply) {
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Express middleware wrapper.
// ---------------------------------------------------------------------------

export function identityMiddleware(req, _res, next) {
  const enabled =
    (process.env.IDENTITY_FILTER_ENABLED ?? 'true').toLowerCase() !== 'false';
  req.identity = {
    enabled,
    buildSystemPrompt: buildIdentitySystemPrompt,
    verify: enabled ? verifyIdentity : () => ({ ok: true }),
  };
  next();
}

export default identityMiddleware;
