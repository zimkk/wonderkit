"use client";

import type { UsageDailyRollup } from "@kit/db";

/** Simple SVG bar chart for the 14-day token rollup on the dashboard overview.
 *  Receives already-fetched rollup rows; no client data fetching. */
export function UsageChart({ data }: { data: UsageDailyRollup[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
        No usage data yet — send your first AI request to see a chart.
      </div>
    );
  }

  // Aggregate tokens per day (multiple features → one bar per date).
  const byDate = new Map<string, number>();
  for (const row of data) {
    const key = new Date(row.date).toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + row.tokens);
  }

  const entries = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const W = 560;
  const H = 140;
  const barW = Math.max(8, Math.floor((W - entries.length * 4) / entries.length));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-label="Token usage bar chart"
      role="img"
    >
      {entries.map(([date, tokens], i) => {
        const barH = Math.max(2, (tokens / maxVal) * (H - 24));
        const x = i * (barW + 4);
        const y = H - 20 - barH;
        return (
          <g key={date}>
            <rect x={x} y={y} width={barW} height={barH} rx={2} className="fill-brand-500 opacity-80" />
            {i % Math.ceil(entries.length / 7) === 0 && (
              <text
                x={x + barW / 2}
                y={H - 4}
                textAnchor="middle"
                className="fill-zinc-400 text-[9px]"
                fontSize={9}
              >
                {date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
