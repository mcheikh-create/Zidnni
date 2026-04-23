// Zidnni/frontend/src/components/Chat.jsx
// Maqasid: حفظ العقل
//
// Streams tokens from POST /api/chat via fetch + ReadableStream.
// SSE contract:  event: token  data: "<chunk>"
//                event: done   data: {ok:true} | {ok:false, reason:"..."}

import { useState, useEffect, useRef } from "react";
import Message from "./Message.jsx";
import Input from "./Input.jsx";

export default function Chat({ conversationId, lang, t }) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function handleSend(text) {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);
    setStreamingContent("");

    let accumulated = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text, lang }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            if (currentEvent === "token") {
              accumulated += raw;
              setStreamingContent(accumulated);
            } else if (currentEvent === "done") {
              let verdict = { ok: true };
              try { verdict = JSON.parse(raw); } catch (_) {}
              // Capture accumulated NOW before resetting — React 18 batches the
              // setMessages updater and calls it after accumulated = "" runs,
              // which would produce an empty message if we close over the variable.
              const reply = accumulated;
              accumulated = "";
              setStreamingContent("");
              if (!verdict.ok) {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: t.chat.driftRefused },
                ]);
              } else {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: reply },
                ]);
              }
            }
          }
        }
      }
    } catch (_err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t.chat.error },
      ]);
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }

  return (
    <div className="chat">
      <div className="chat__messages" role="log" aria-live="polite">
        {messages.length === 0 && !streaming && (
          <p className="chat__empty">{t.chat.empty}</p>
        )}
        {messages.map((msg, i) => (
          <Message key={i} role={msg.role} content={msg.content} />
        ))}
        {streaming && streamingContent && (
          <Message role="assistant" content={streamingContent} />
        )}
        {streaming && !streamingContent && (
          <div className="chat__thinking">
            <span className="chat__thinking-dot" />
            <span className="chat__thinking-dot" />
            <span className="chat__thinking-dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat__input-area">
        <Input onSend={handleSend} disabled={streaming} t={t} lang={lang} />
      </div>
    </div>
  );
}
