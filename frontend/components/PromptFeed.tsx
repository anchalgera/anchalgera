"use client";

import { PromptEvent } from "@/lib/api";
import { useEffect, useRef } from "react";

export function PromptFeed({ events }: { events: PromptEvent[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [events]);

  return (
    <div
      ref={containerRef}
      className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-inner"
    >
      {events.length === 0 ? (
        <p className="text-sm text-slate-400">
          When the session starts, your AI guide will begin prompting you with thoughtful questions.
        </p>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className={`rounded-lg border p-4 transition ${
              event.type === "prompt"
                ? "border-indigo-400/20 bg-indigo-950/40"
                : "border-emerald-400/20 bg-emerald-950/20"
            }`}
          >
            <p className="text-xs uppercase tracking-widest text-slate-400">
              {event.type === "prompt" ? "AI Prompt" : "AI Response"}
            </p>
            <p className="mt-2 text-base leading-relaxed text-slate-100">{event.content}</p>
            {event.audioUrl ? (
              <audio controls className="mt-3 w-full" src={event.audioUrl} />
            ) : null}
            <p className="mt-3 text-xs text-slate-500">
              {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
