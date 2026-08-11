"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";

export type LandingLeaderboardRow = {
  rank: number;
  handle: string;
  focus: string;
  roi: number;
  yield: number;
  winRate: number;
};

function Roi({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`tabular font-mono text-sm font-semibold ${
        positive ? "text-lime" : "text-ink"
      }`}
    >
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export default function Leaderboard({ data }: { data: LandingLeaderboardRow[] }) {
  return (
    <section id="leaderboard" className="relative mx-auto max-w-5xl px-6 py-24 lg:py-32">
      <div className="mb-12 max-w-2xl">
        <span className="font-mono text-xs uppercase tracking-wider text-slate">
          Social Proof
        </span>
        <h2 className="mt-4 text-display-2 font-semibold text-ink">
          Ranked on results, not reputation.
        </h2>
        <p className="mt-4 max-w-lg text-slate">
          Every figure below is pulled straight from the ledger — no
          self-reported records, no deleted losses.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-obsidian-line bg-obsidian-raised/60">
        {/* Desktop / tablet table */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-[3.5rem_1fr_7rem_7rem_7rem] border-b border-obsidian-line px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-slate">
            <span>Rank</span>
            <span>Analyst</span>
            <span className="text-right">Verified ROI</span>
            <span className="text-right">Yield (₦)</span>
            <span className="text-right">Win Rate</span>
          </div>

          {data.map((row, i) => (
            <motion.div
              key={row.handle}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
              className={`grid grid-cols-[3.5rem_1fr_7rem_7rem_7rem] items-center px-6 py-5 transition-colors hover:bg-white/[0.03] ${
                i !== data.length - 1 ? "border-b border-obsidian-line" : ""
              }`}
            >
              <div className="flex items-center">
                {row.rank === 1 ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime/10 text-lime">
                    <Crown className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                ) : (
                  <span className="font-mono text-sm text-slate">
                    #{row.rank}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{row.handle}</p>
                <p className="mt-0.5 text-xs text-slate">{row.focus}</p>
              </div>
              <div className="text-right">
                <Roi value={row.roi} />
              </div>
              <div className="tabular text-right font-mono text-sm text-ink/80">
                +₦{new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(row.yield * 100)}
              </div>
              <div className="tabular text-right font-mono text-sm text-ink/80">
                {row.winRate.toFixed(1)}%
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col lg:hidden">
          {data.map((row, i) => (
            <motion.div
              key={row.handle}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
              className={`px-5 py-5 ${
                i !== data.length - 1 ? "border-b border-obsidian-line" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {row.rank === 1 ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime/10 text-lime">
                      <Crown className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-slate">
                      #{row.rank}
                    </span>
                  )}
                  <p className="text-sm font-medium text-ink">{row.handle}</p>
                </div>
                <Roi value={row.roi} />
              </div>
              <p className="mt-1 pl-9 text-xs text-slate">{row.focus}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 pl-9">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate">
                    Yield
                  </p>
                  <p className="tabular mt-1 font-mono text-sm text-ink/80">
                    +₦{new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(row.yield * 100)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate">
                    Win Rate
                  </p>
                  <p className="tabular mt-1 font-mono text-sm text-ink/80">
                    {row.winRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
