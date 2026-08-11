"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, TrendingUp, Bell, Wifi, BatteryFull } from "lucide-react";
import type { Feature } from "@/lib/data";

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pb-1 pt-3 font-mono text-[10px] text-ink/60">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <Wifi className="h-3 w-3" />
        <BatteryFull className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function ProofScreen() {
  const rows = [
    { league: "NBA", pick: "LAL -4.5", time: "18:41Z" },
    { league: "ATP", pick: "Sinner ML", time: "18:44Z" },
    { league: "MLB", pick: "O 8.5", time: "18:52Z" },
  ];
  return (
    <div className="flex flex-col gap-2.5 px-4 pt-2">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate">
        Proof Engine
      </p>
      {rows.map((r) => (
        <div
          key={r.pick}
          className="flex items-center justify-between rounded-xl border border-obsidian-line bg-obsidian-raised px-3.5 py-3"
        >
          <div>
            <p className="text-xs font-medium text-ink">{r.pick}</p>
            <p className="mt-0.5 font-mono text-[10px] text-slate">
              {r.league} · {r.time}
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-lime/10 px-2 py-1 font-mono text-[9px] font-medium text-lime">
            <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
            LOCKED
          </span>
        </div>
      ))}
      <p className="mt-1 px-1 font-mono text-[9px] leading-relaxed text-slate">
        Every signal is timestamped at the API layer before settlement. No
        analyst can edit or delete a published pick.
      </p>
    </div>
  );
}

function RoiScreen() {
  const bars = [38, 52, 44, 61, 58, 74, 69, 82];
  return (
    <div className="flex flex-col gap-4 px-4 pt-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate">
        Immutable ROI
      </p>
      <div>
        <p className="font-mono text-3xl font-semibold text-lime">+184.2%</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate">
          <TrendingUp className="h-3 w-3 text-lime" />
          Verified across 312.5 units risked
        </p>
      </div>
      <div className="flex h-24 items-end gap-1.5 rounded-xl border border-obsidian-line bg-obsidian-raised p-3">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-steel/40 to-lime/70"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="px-1 font-mono text-[9px] leading-relaxed text-slate">
        Calculated straight from settled outcomes. No self-reported records,
        no cherry-picked screenshots.
      </p>
    </div>
  );
}

function DashboardScreen() {
  const alerts = [
    { name: "@SharpVector", pick: "Published a new NBA signal", time: "now" },
    { name: "@QuantEdgeNFL", pick: "Signal settled: WON", time: "6m" },
  ];
  return (
    <div className="flex flex-col gap-2.5 px-4 pt-2">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate">
        Allocator Dashboard
      </p>
      {alerts.map((a) => (
        <div
          key={a.name + a.time}
          className="flex items-start gap-3 rounded-xl border border-obsidian-line bg-obsidian-raised px-3.5 py-3"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-steel/15 text-steel">
            <Bell className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-ink">{a.name}</p>
            <p className="text-[11px] text-slate">{a.pick}</p>
          </div>
          <span className="ml-auto shrink-0 font-mono text-[9px] text-slate">
            {a.time}
          </span>
        </div>
      ))}
      <p className="mt-1 px-1 font-mono text-[9px] leading-relaxed text-slate">
        Alerts fire the instant a signal is written to the ledger — not on a
        delay, not after the line moves.
      </p>
    </div>
  );
}

const screens: Record<Feature["mock"], ReactNode> = {
  proof: <ProofScreen />,
  roi: <RoiScreen />,
  dashboard: <DashboardScreen />,
};

export default function PhoneMockup({ active }: { active: Feature["mock"] }) {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[300px]">
      {/* ambient glow behind the device */}
      <div className="absolute inset-0 -z-10 rounded-[3rem] bg-lime/10 blur-3xl" />

      <div className="relative rounded-[2.75rem] border-[6px] border-obsidian-raised bg-obsidian-raised shadow-2xl">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-obsidian">
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-obsidian-raised" />

          <StatusBar />

          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="font-mono text-[11px] font-medium text-ink">
              VeridLedger
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse-dot" />
          </div>

          <div className="h-[380px] pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {screens[active]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
