"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PromptFeed } from "@/components/PromptFeed";
import { SessionTimer } from "@/components/SessionTimer";
import { SummaryCard } from "@/components/SummaryCard";
import {
  PromptEvent,
  SessionSummary,
  completeSession,
  createPromptEventSource,
  fetchPersistedSummary,
  startSession,
  uploadAudioChunk,
} from "@/lib/api";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

const SESSION_DURATION_MS = 5 * 60 * 1000;

type SessionPhase = "idle" | "running" | "completed";

export default function HomePage() {
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<PromptEvent[]>([]);
  const [localSummary, setLocalSummary] = useState<SessionSummary | null>(null);
  const [persistedSummary, setPersistedSummary] = useState<SessionSummary | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isFetchingPersisted, setIsFetchingPersisted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const completionGuard = useRef(false);

  const appendEvent = useCallback((incoming: PromptEvent) => {
    setEvents((prev) => {
      const exists = prev.some((event) => event.id === incoming.id);
      if (exists) {
        return prev;
      }
      return [...prev, incoming].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
  }, []);

  const handleAudioChunk = useCallback(
    async (blob: Blob, sequence: number) => {
      if (!sessionId) return;
      await uploadAudioChunk(sessionId, blob, sequence);
    },
    [sessionId]
  );

  const { start: startRecording, stop: stopRecording, isRecording, error: recordingError } = useAudioRecorder({
    onChunk: handleAudioChunk,
  });

  useEffect(() => {
    if (sessionPhase !== "running" || !sessionId) {
      return;
    }

    const eventSource = createPromptEventSource(sessionId);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as PromptEvent;
        appendEvent(payload);
      } catch (err) {
        console.error("Failed to parse prompt event", err);
      }
    };

    eventSource.onerror = () => {
      console.warn("Prompt event stream encountered an error; closing connection");
      eventSource.close();
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [appendEvent, sessionId, sessionPhase]);

  const resetSessionState = useCallback(() => {
    setEvents([]);
    setLocalSummary(null);
    setPersistedSummary(null);
    setError(null);
    setIsCompleting(false);
    setIsFetchingPersisted(false);
    setSessionId(null);
    completionGuard.current = false;
  }, []);

  const handleSessionStart = useCallback(async () => {
    try {
      resetSessionState();
      const response = await startSession();
      setSessionId(response.sessionId);
      setSessionPhase("running");
      if (response.initialPrompt) {
        appendEvent(response.initialPrompt);
      }
      await startRecording();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to start session");
      setSessionPhase("idle");
      setSessionId(null);
    }
  }, [appendEvent, resetSessionState, startRecording]);

  const handleSessionComplete = useCallback(async () => {
    if (!sessionId || completionGuard.current) {
      return;
    }
    completionGuard.current = true;
    setIsCompleting(true);
    stopRecording();
    eventSourceRef.current?.close();
    setSessionPhase("completed");

    try {
      const summary = await completeSession(sessionId);
      setLocalSummary(summary);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("latestJournalSummary", JSON.stringify(summary));
      }
      setIsFetchingPersisted(true);
      const persisted = await fetchPersistedSummary(sessionId);
      setPersistedSummary(persisted);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Session completion failed");
    } finally {
      setIsCompleting(false);
      setIsFetchingPersisted(false);
    }
  }, [sessionId, stopRecording]);

  const displayedSummary = useMemo(() => {
    return persistedSummary ?? localSummary;
  }, [localSummary, persistedSummary]);

  const summaryStatusMessage = useMemo(() => {
    if (!localSummary) return null;
    if (!persistedSummary && isFetchingPersisted) {
      return "Saving your reflections to the journal...";
    }
    if (persistedSummary) {
      return "This journal entry has been saved.";
    }
    return "Temporary journal summary (waiting for saved copy).";
  }, [isFetchingPersisted, localSummary, persistedSummary]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const cached = window.sessionStorage.getItem("latestJournalSummary");
    if (cached && !localSummary) {
      try {
        const parsed = JSON.parse(cached) as SessionSummary;
        setLocalSummary(parsed);
      } catch (err) {
        console.error("Failed to parse cached summary", err);
      }
    }
  }, [localSummary]);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-50">Five-minute reflective journaling</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Step into a guided session where your AI coach nudges you with thoughtful prompts, listens to your responses,
              and distills your reflections into actionable insights.
            </p>
          </div>
          <SessionTimer
            durationMs={SESSION_DURATION_MS}
            isRunning={sessionPhase === "running"}
            onExpire={handleSessionComplete}
          />
        </div>
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={handleSessionStart}
            disabled={sessionPhase === "running"}
            className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-10 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {sessionPhase === "running" ? "Session in progress" : "Start"}
          </button>
          <div className="text-sm text-slate-400">
            <p className="font-medium text-slate-200">Microphone status: {isRecording ? "listening" : "idle"}</p>
            {recordingError ? <p className="text-rose-400">{recordingError}</p> : null}
          </div>
        </div>
        {error ? (
          <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>
        ) : null}
      </section>

      <section className="flex flex-1 flex-col gap-6 md:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-100">Real-time guidance</h2>
          <PromptFeed events={events} />
        </div>
        {displayedSummary ? (
          <div className="md:w-[360px] md:flex-none">
            <SummaryCard summary={displayedSummary} />
            {summaryStatusMessage ? (
              <p className="mt-3 text-xs text-slate-400">{summaryStatusMessage}</p>
            ) : null}
          </div>
        ) : sessionPhase === "completed" && !isCompleting ? (
          <div className="md:w-[360px] md:flex-none">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-200">
              <p>Your summary will appear here momentarily.</p>
            </div>
          </div>
        ) : null}
      </section>

      {sessionPhase === "running" ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400">
          <p>
            Need to pause? Simply stay silent for a moment. The AI will continue offering prompts until the five-minute session
            concludes automatically.
          </p>
        </div>
      ) : null}

      {isCompleting ? (
        <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4 text-sm text-indigo-100">
          Finalizing your reflections…
        </div>
      ) : null}
    </div>
  );
}
