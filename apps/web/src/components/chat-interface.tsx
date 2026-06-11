"use client";

import { useState, useRef, useEffect } from "react";
import type { Message } from "@kit/ai";

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [noProvider, setNoProvider] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...next, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        if (res.status === 402) setNoProvider(true);
        setMessages([...next, { role: "assistant", content: err.error ?? "Error — check your AI provider config." }]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let content = "";

      if (!reader) throw new Error("No body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          const chunk = JSON.parse(data) as { delta: string };
          content += chunk.delta;
          setMessages([...next, { role: "assistant", content }]);
        }
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Connection error — please try again." }]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <p className="text-sm text-gray-500 mt-1">Powered by your configured AI provider.</p>
      </div>

      {noProvider && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 mb-4">
          No AI provider configured. Add <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>, or start Ollama locally.
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-lg border bg-white p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">Send a message to start chatting.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900"
            }`}>
              {m.content || (streaming && m.role === "assistant" ? <span className="animate-pulse">▌</span> : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          disabled={streaming}
          className="flex-1 rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {streaming ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
