"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line } from "recharts";
import { ShieldCheck, Crown, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export type CapperData = {
  id: string;
  name: string;
  handle: string;
  category: string;
  verified: boolean;
  roi: number;
  yield: number;
  winRate: number;
  averageOdds: number;
  trend: number[];
};

const CATEGORIES = ["All Markets", "NBA", "NFL", "Soccer", "Tennis", "MMA", "MLB", "Mixed"];

function initials(name: string) {
  if (!name) return "";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatSigned(value: number, type: "%" | "currency" = "%") {
  const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
  const abs = Math.abs(value);
  
  if (type === "currency") {
    const formatted = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(abs);
    return `${sign}₦${formatted}`;
  } else {
    return `${sign}${abs.toFixed(1)}%`;
  }
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function Avatar({ name, isAlpha }: { name: string, isAlpha: boolean }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold font-mono ${
        isAlpha 
          ? "bg-card text-primary border border-primary" 
          : "bg-card text-foreground border border-border"
      }`}
    >
      {initials(name)}
    </div>
  );
}

function AlphaBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-primary-soft text-primary">
      <Crown className="h-3 w-3" strokeWidth={2.5} />
      Alpha Tier
    </span>
  );
}

function WinRateBar({ value }: { value: number }) {
  const positive = value >= 50;
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-sm font-medium font-mono text-foreground tabular-nums">
        {value.toFixed(0)}%
      </span>
      <div className="h-1 w-12 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${positive ? "bg-primary" : "bg-negative"}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function Sparkline({ trend }: { trend: number[] }) {
  const data = trend.map((v, i) => ({ i, v }));
  
  // Find if overall trend is negative to color line red
  const isNegative = trend.length > 1 && trend[trend.length - 1] < trend[0];

  return (
    <LineChart width={100} height={32} data={data}>
      <Line
        type="monotone"
        dataKey="v"
        stroke={isNegative ? "var(--color-negative)" : "var(--color-primary)"}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function DiscoveryLeaderboard({ analysts }: { analysts: CapperData[] }) {
  const [active, setActive] = useState("All Markets");

  const rows = useMemo(() => {
    const filtered =
      active === "All Markets"
        ? analysts
        : analysts.filter((a) => a.category === active);
        
    return [...filtered]
      .sort((a, b) => b.roi - a.roi)
      .map((a, i) => ({ ...a, rank: i + 1 }));
  }, [active, analysts]);

  return (
    <div className="vl-leaderboard w-full overflow-hidden rounded-2xl border border-border bg-background text-foreground">
      <style>{`
        .vl-leaderboard .vl-tabs { scrollbar-width: none; -ms-overflow-style: none; }
        .vl-leaderboard .vl-tabs::-webkit-scrollbar { display: none; }
        .vl-leaderboard .vl-row:hover { background-color: var(--color-card-hover); }
        .vl-leaderboard .vl-ghost-btn { transition: border-color .15s ease, color .15s ease, background-color .15s ease; }
        .vl-leaderboard .vl-ghost-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background-color: var(--color-primary-soft);
        }
        .vl-leaderboard button:focus-visible,
        .vl-leaderboard .vl-ghost-btn:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .vl-leaderboard * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Discovery Leaderboard
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verified analyst performance, ranked by realized ROI
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 sm:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-primary" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Live
          </span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-5 sm:px-6">
        <div className="vl-tabs flex gap-6 overflow-x-auto border-b border-border">
          {CATEGORIES.map((cat) => {
            // Only show category if analysts exist in it, or if it's "All Markets"
            const count = analysts.filter(a => a.category === cat).length;
            if (cat !== "All Markets" && count === 0) return null;
            
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`relative shrink-0 whitespace-nowrap py-3 text-sm font-medium ${
                  active === cat ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {cat}
                {active === cat && (
                  <motion.div
                    layoutId="vl-tab-underline"
                    className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground sm:px-6" style={{ width: "3rem" }}>
                #
              </th>
              <th className="px-3 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Analyst
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Verified ROI
              </th>
              <th className="hidden px-3 py-3 text-right text-xs font-medium uppercase tracking-widest text-muted-foreground md:table-cell">
                Yield (₦)
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Win Rate
              </th>
              <th className="hidden px-3 py-3 text-right text-xs font-medium uppercase tracking-widest text-muted-foreground sm:table-cell">
                Avg. Odds
              </th>
              <th className="hidden px-3 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground md:table-cell">
                30-Day Equity Curve
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-widest text-muted-foreground sm:px-6">
                Action
              </th>
            </tr>
          </thead>
          <AnimatePresence mode="popLayout" initial={false}>
            <tbody key={active}>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No analysts found in this category.
                  </td>
                </tr>
              )}
              {rows.map((a, i) => {
                const isAlpha = a.rank <= 3;
                const roiPositive = a.roi >= 0;
                const yieldPositive = a.yield >= 0;
                
                return (
                  <motion.tr
                    key={a.handle}
                    className="vl-row border-b border-border"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.025 }}
                  >
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={`text-sm font-mono tabular-nums ${isAlpha ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {String(a.rank).padStart(2, "0")}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.name} isAlpha={isAlpha} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">
                              {a.name}
                            </span>
                            {a.verified && (
                              <ShieldCheck
                                className="h-3.5 w-3.5 text-primary"
                                strokeWidth={2.5}
                              />
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              @{a.handle}
                            </span>
                            {active === "All Markets" && (
                              <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                                {a.category}
                              </span>
                            )}
                          </div>
                          {isAlpha && <div className="mt-1.5">
                            <AlphaBadge />
                          </div>}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-right">
                      <span
                        className={`text-sm font-semibold font-mono tabular-nums ${
                          roiPositive ? "text-primary" : "text-negative"
                        }`}
                      >
                        {formatSigned(a.roi, "%")}
                      </span>
                    </td>

                    <td className="hidden px-3 py-4 text-right md:table-cell">
                      <span
                        className={`text-sm font-mono tabular-nums ${
                          yieldPositive ? "text-primary" : "text-negative"
                        }`}
                      >
                        {formatSigned(a.yield, "currency")}
                      </span>
                    </td>

                    <td className="px-3 py-4 text-right">
                      <WinRateBar value={a.winRate} />
                    </td>

                    <td className="hidden px-3 py-4 text-right sm:table-cell">
                      <span className="text-sm font-mono text-muted-foreground">
                        {a.averageOdds ? a.averageOdds.toFixed(2) : "-"}
                      </span>
                    </td>

                    <td className="hidden px-3 py-4 md:table-cell">
                      <Sparkline trend={a.trend} />
                    </td>

                    <td className="px-5 py-4 text-right sm:px-6">
                      <Link href={`/analyst/${a.handle}`}>
                        <button className="vl-ghost-btn inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground">
                          View Terminal
                          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                      </Link>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </AnimatePresence>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3 sm:px-6">
        <p className="text-xs text-muted-foreground">
          Rankings recalculated every 15 minutes from settled positions only.
        </p>
      </div>
    </div>
  );
}
