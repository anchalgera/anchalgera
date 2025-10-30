"use client";

import { SessionSummary } from "@/lib/api";

export function SummaryCard({
  summary,
  title,
}: {
  summary: SessionSummary;
  title?: string;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow">
      <h2 className="text-lg font-semibold text-slate-50">{title ?? "Session Summary"}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{summary.summary}</p>
      <div className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Life-improvement tips</h3>
        <ul className="mt-2 space-y-2">
          {summary.tips.map((tip, index) => (
            <li
              key={`${index}-${tip.slice(0, 10)}`}
              className="flex items-start gap-2 rounded-lg bg-slate-900/70 p-3 text-sm text-slate-100"
            >
              <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-emerald-400" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Generated at {new Date(summary.generatedAt).toLocaleString()}
      </p>
    </section>
  );
}
