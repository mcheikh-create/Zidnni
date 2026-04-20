// Zidnni/backend/services/memory.js
// Maqasid: حفظ العقل
//
// Conversation history store. Phase 1 is in-memory: a Map keyed by
// conversationId. Phase 2 will swap the implementation for a persistent
// store (SQLite or Postgres) behind the same interface — so this module
// exports a minimal, deliberate API: append, history, reset, list.

const MAX_MESSAGES_PER_CONVERSATION = 200;
const MAX_CONVERSATIONS = 10_000;

/** @typedef {{ role: 'user'|'assistant'|'system', content: string, ts: number }} Message */

const store = new Map();

/**
 * Append a message to a conversation. Creates the conversation if new.
 * Silently trims to MAX_MESSAGES_PER_CONVERSATION from the oldest end.
 *
 * @param {string} conversationId
 * @param {{ role: 'user'|'assistant'|'system', content: string }} message
 * @returns {Message}
 */
export function append(conversationId, message) {
  if (!conversationId) throw new Error('conversationId is required');
  if (!message?.role || typeof message.content !== 'string') {
    throw new Error('message must have { role, content }');
  }
  let arr = store.get(conversationId);
  if (!arr) {
    if (store.size >= MAX_CONVERSATIONS) evictOldestConversation();
    arr = [];
    store.set(conversationId, arr);
  }
  const entry = { role: message.role, content: message.content, ts: Date.now() };
  arr.push(entry);
  if (arr.length > MAX_MESSAGES_PER_CONVERSATION) {
    arr.splice(0, arr.length - MAX_MESSAGES_PER_CONVERSATION);
  }
  return entry;
}

/**
 * Return the full message history for a conversation, in order.
 * @param {string} conversationId
 * @returns {Message[]}
 */
export function history(conversationId) {
  return store.get(conversationId)?.slice() ?? [];
}

/**
 * Clear a conversation.
 * @param {string} conversationId
 * @returns {boolean}
 */
export function reset(conversationId) {
  return store.delete(conversationId);
}

/** @returns {string[]} */
export function list() {
  return [...store.keys()];
}

function evictOldestConversation() {
  const oldest = store.keys().next().value;
  if (oldest !== undefined) store.delete(oldest);
}

export const _internal = { store, MAX_MESSAGES_PER_CONVERSATION, MAX_CONVERSATIONS };
