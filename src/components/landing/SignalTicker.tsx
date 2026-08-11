import { Lock, CheckCircle2 } from "lucide-react";
import { tickerItems } from "@/lib/data";

export default function SignalTicker() {
  // Duplicate the list so the -50% translateX loop is seamless
  const loop = [...tickerItems, ...tickerItems];

  return (
    <div
      className="relative w-full overflow-hidden border-y border-obsidian-line bg-obsidian-raised/60"
      aria-label="Live feed of recently locked signals"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-obsidian to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-obsidian to-transparent" />

      <div className="flex w-max animate-marquee items-center py-3">
        {loop.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className="mx-4 flex shrink-0 items-center gap-2 font-mono text-xs text-slate"
          >
            {item.status === "LOCKED" ? (
              <Lock className="h-3 w-3 text-lime" strokeWidth={2.5} />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-steel" strokeWidth={2.5} />
            )}
            <span className="text-ink/70">{item.id}</span>
            <span>·</span>
            <span>{item.league}</span>
            <span>·</span>
            <span className={item.status === "LOCKED" ? "text-lime" : "text-steel"}>
              {item.status}
            </span>
            <span className="text-slate/70">{item.lockTime}</span>
            <span className="ml-4 text-obsidian-line">/</span>
          </div>
        ))}
      </div>
    </div>
  );
}
