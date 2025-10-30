"use client";

import { useEffect, useMemo, useState } from "react";
import { SummaryCard } from "@/components/SummaryCard";
import { fetchJournalEntry, fetchJournalHistory, JournalEntryMeta, SessionSummary } from "@/lib/api";

export default function HistoryPage() {
  const [entries, setEntries] = useState<JournalEntryMeta[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<SessionSummary | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingEntries(true);
      try {
        const history = await fetchJournalHistory();
        setEntries(history.sort((a, b) => new Date(b.sessionStartedAt).getTime() - new Date(a.sessionStartedAt).getTime()));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unable to load journal history");
      } finally {
        setIsLoadingEntries(false);
      }
    };

    loadHistory();
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      if (!selectedEntryId) {
        setSelectedSummary(null);
        return;
      }
      setIsLoadingSummary(true);
      try {
        const summary = await fetchJournalEntry(selectedEntryId);
        setSelectedSummary(summary);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unable to load journal entry");
      } finally {
        setIsLoadingSummary(false);
      }
    };

    loadSummary();
  }, [selectedEntryId]);

  const activeEntry = useMemo(() => entries.find((entry) => entry.id === selectedEntryId) ?? null, [entries, selectedEntryId]);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold text-slate-50">Journal history</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Revisit past sessions, re-read AI summaries, and reflect on the personalized recommendations generated for you over
          time.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Previous sessions</h2>
          <div className="mt-4 space-y-2">
            {isLoadingEntries ? (
              <p className="text-sm text-slate-400">Loading entries…</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-slate-400">No journal entries found yet.</p>
            ) : (
              entries.map((entry) => {
                const startedAt = new Date(entry.sessionStartedAt);
                const formattedDate = startedAt.toLocaleDateString(undefined, {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                });
                const formattedTime = startedAt.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                      selectedEntryId === entry.id
                        ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-100"
                        : "border-slate-800 bg-slate-900/40 text-slate-200 hover:border-indigo-400/40 hover:bg-indigo-500/10"
                    }`}
                  >
                    <p className="font-medium">{formattedDate}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{formattedTime}</p>
                    {entry.summary ? (
                      <p className="clamped-two-lines mt-2 text-xs text-slate-300/90">{entry.summary}</p>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          {isLoadingSummary ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300">
              Loading summary…
            </div>
          ) : selectedSummary && activeEntry ? (
            <SummaryCard summary={selectedSummary} title={`Session on ${new Date(activeEntry.sessionStartedAt).toLocaleString()}`} />
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300">
              Select a journal entry to revisit its takeaways and recommendations.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
