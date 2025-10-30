"use client";

import { useEffect, useMemo, useState } from "react";

export function SessionTimer({
  durationMs,
  isRunning,
  onExpire,
}: {
  durationMs: number;
  isRunning: boolean;
  onExpire: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    if (!isRunning) {
      setRemainingMs(durationMs);
      return;
    }

    let animationFrame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const nextRemaining = Math.max(durationMs - elapsed, 0);
      setRemainingMs(nextRemaining);
      if (nextRemaining === 0) {
        onExpire();
        return;
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [durationMs, isRunning, onExpire]);

  const formatted = useMemo(() => {
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [remainingMs]);

  const percent = useMemo(() => {
    return 100 - Math.min(100, (remainingMs / durationMs) * 100);
  }, [durationMs, remainingMs]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            className="text-slate-800"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
          />
          <circle
            className="text-indigo-400 transition-[stroke-dashoffset] duration-200"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={(percent / 100) * 2 * Math.PI * 45}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
          {formatted}
        </span>
      </div>
      <div>
        <p className="text-sm uppercase tracking-wider text-slate-400">Time remaining</p>
        <p className="text-2xl font-semibold text-slate-50">{formatted}</p>
      </div>
    </div>
  );
}
