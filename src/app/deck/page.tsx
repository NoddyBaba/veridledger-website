"use client";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import OddsBoard from "@/components/OddsBoard";
import BetSlipDrawer from "@/components/BetSlipDrawer";
import CryptoEngineLoader from "@/components/CryptoEngineLoader";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { calculateAnalystStats } from "@/lib/stats";

export default function DeckPage() {
  const { user, profile } = useAuth();
  const [picks, setPicks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>({ roi: "+0.0%", winRate: "0%", streak: "0W", mrr: 0, totalGraded: 0 });
  const [filter, setFilter] = useState<"All" | "LOCKED" | "GRADED">("All");

  const [isOddsBoardOpen, setIsOddsBoardOpen] = useState(false);
  const [selections, setSelections] = useState<any[]>([]);
  const [isSlipDrawerOpen, setIsSlipDrawerOpen] = useState(false);

  async function fetchPicks() {
    if (!user || !supabase) return;
    const { data } = await supabase
      .from("picks")
      .select("*")
      .eq("analyst_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setPicks(data);
      const computed = calculateAnalystStats(data);
      
      let streakCount=0;
      let currentStreak='W';
      for(let p of data){
        if(p.status === 'LOCKED' || p.status === 'PUSH') continue;
        if(streakCount === 0){
          currentStreak = p.status === 'WIN' ? 'W' : 'L';
          streakCount=1;
        } else if((p.status === 'WIN' && currentStreak === 'W') || (p.status === 'LOSS' && currentStreak === 'L')){
          streakCount++;
        } else { break; }
      }
      
      setStats({
        roi: computed.roi > 0 ? `+${computed.roi}%` : `${computed.roi}%`,
        winRate: `${computed.winRate}%`,
        streak: `${streakCount}${currentStreak}`,
        mrr: 2500,
        totalGraded: computed.totalGraded
      });
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPicks();
  }, [user]);

  const handleAddSelection = (sel: any) => {
    setSelections([...selections, sel]);
    if (!isSlipDrawerOpen) setIsSlipDrawerOpen(true);
  };
  const handleRemoveSelection = (id: string) => {
    setSelections(selections.filter((s) => s.id !== id));
  };

  const filteredPicks = picks.filter(p => {
    if (filter === "LOCKED") return p.status === "LOCKED";
    if (filter === "GRADED") return p.status !== "LOCKED";
    return true;
  });

  const getStatusSvg = (status: string) => {
    if (status === 'WIN') return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>;
    if (status === 'LOSS') return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
    return <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V7a3 3 0 0 1 3-3z"/></svg>;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <CryptoEngineLoader text="VERIFYING LEDGER..." size="lg" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background animate-in fade-in duration-500">
      <div className="flex-1 overflow-y-auto px-5 md:px-10 py-7 pb-24 custom-scroll">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 mb-7">
          <div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-tight">Analyst Deck</h1>
            <p className="m-0 mt-1.5 text-[14px] text-secondary">Manage your ledger and subscribers.</p>
          </div>
          <div className="flex flex-col md:items-end gap-1.5">
            <button 
              onClick={() => setIsOddsBoardOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-[46px] px-[22px] border-none rounded-lg bg-primary text-primary-foreground font-sans text-[14.5px] font-extrabold cursor-pointer transition-all hover:brightness-105 active:translate-y-[1px] w-full md:w-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Timestamp Position
            </button>
            <p className="m-0 text-[11.5px] text-tertiary max-w-[220px] text-left md:text-right">Seals a new pick with a verified time — proof it was called before kickoff.</p>
          </div>
        </div>

        {/* Subs & MRR */}
        <div className="grid grid-cols-2 gap-3.5 mb-7">
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-2.5">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-soft text-blue">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <span className="text-[11px] font-bold tracking-widest uppercase text-tertiary">Subscribers</span>
            <span className="font-mono text-[26px] font-bold tabular-nums">1</span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-2.5">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-soft text-primary">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
            <span className="text-[11px] font-bold tracking-widest uppercase text-tertiary">Est. MRR</span>
            <span className="font-mono text-[26px] font-bold tabular-nums">₦2,500</span>
            <p className="m-0 -mt-1 text-[11px] text-tertiary">Estimated from current subscribers</p>
          </div>
        </div>

        {/* Engine Metrics */}
        <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-widest uppercase text-foreground mb-3.5 m-0">
          <svg width="16" height="16" className="text-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
          Proof Engine Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-8">
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-2.5">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-soft text-primary">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
            </span>
            <span className="text-[11px] font-bold tracking-widest uppercase text-tertiary">Total ROI</span>
            <span className="font-mono text-[26px] font-bold tabular-nums text-primary">{stats.roi}</span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-2.5">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-soft text-blue">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>
            </span>
            <span className="text-[11px] font-bold tracking-widest uppercase text-tertiary">Win Rate</span>
            <span className="font-mono text-[26px] font-bold tabular-nums">{stats.winRate}</span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-2.5">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-soft text-orange">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            </span>
            <span className="text-[11px] font-bold tracking-widest uppercase text-tertiary">Streak</span>
            <span className={`font-mono font-bold tabular-nums ${stats.totalGraded < 5 ? 'text-tertiary text-[20px]' : 'text-[26px]'}`}>
              {stats.totalGraded < 5 ? 'TBD' : stats.streak}
            </span>
            {stats.totalGraded < 5 && <p className="m-0 -mt-1 text-[11px] text-tertiary">Not enough graded picks yet</p>}
          </div>
        </div>

        {/* Ledger */}
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-widest uppercase text-foreground m-0">Ledger</h2>
          <div className="flex gap-1 bg-surface-inset border border-border p-1 rounded-full">
            {["All", "LOCKED", "GRADED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={`border-none font-sans text-[12px] font-bold tracking-widest px-3.5 py-1.5 rounded-full cursor-pointer transition-all ${
                  filter === tab ? "bg-primary text-primary-foreground" : "bg-transparent text-secondary hover:text-foreground"
                }`}
              >
                {tab === "All" ? "All" : tab === "LOCKED" ? "Locked" : "Graded"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {filteredPicks.map(pick => {
            // Error-proof parsing of legs
            const legs = pick.selection.split(' + ').map((legStr: string) => {
              const match = legStr.match(/(.+?)\s*\(([\d\.\+]+)\)/);
              if (match) return { name: match[1].trim(), odds: match[2] };
              return { name: legStr.trim(), odds: "" };
            });

            const isLocked = pick.status === "LOCKED";
            const isWon = pick.status === "WIN";
            const isLost = pick.status === "LOSS";
            const isPush = pick.status === "PUSH";

            return (
              <div key={pick.id} className="bg-card border border-border rounded-xl p-[18px_20px]">
                <div className="flex items-start md:items-center justify-between gap-3 mb-3.5 flex-col md:flex-row">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-widest px-[9px] py-1 rounded-full border ${
                      isLocked ? 'bg-blue-soft text-blue border-blue/30' : 
                      isWon ? 'bg-primary-soft text-primary border-primary/30' : 
                      isLost ? 'bg-negative-soft text-negative border-negative/30' : 
                      'bg-surface-inset text-secondary border-border'
                    }`}>
                      {getStatusSvg(pick.status)}
                      {pick.status === 'LOCKED' ? 'Locked' : pick.status === 'WIN' ? 'Won' : pick.status === 'LOSS' ? 'Lost' : pick.status}
                    </span>
                    <span className="text-[12.5px] text-secondary">{pick.sport} · {legs.length > 1 ? `${legs.length}-Leg Parlay` : 'Single'} · {pick.stake}U</span>
                  </div>
                  <span className="font-mono text-[12px] text-tertiary">
                    {new Date(pick.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex flex-col gap-[7px] mb-3.5">
                  {legs.map((leg: any, i: number) => (
                    <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-[3px] md:gap-3 p-[9px_12px] bg-surface-inset rounded-lg">
                      <span className="text-[13.5px] font-semibold text-foreground">{leg.name}</span>
                      <span className="font-mono text-[13px] text-secondary tabular-nums flex-none">
                        {leg.odds ? (Number(leg.odds) > 0 && !String(leg.odds).startsWith('+') ? `+${Number(leg.odds).toFixed(2)}` : Number(leg.odds).toFixed(2)) : ''}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-tertiary">Combined</span>
                  <span className={`font-mono text-[20px] font-bold tabular-nums ${
                    isLocked ? 'text-foreground' : 
                    isWon ? 'text-primary' : 
                    isLost ? 'text-tertiary line-through decoration-negative decoration-2' : 
                    'text-foreground'
                  }`}>
                    {pick.odds > 0 ? `+${Number(pick.odds).toFixed(2)}` : Number(pick.odds).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredPicks.length === 0 && (
            <div className="text-center py-10 text-secondary">No picks found in ledger.</div>
          )}
        </div>

      </div>

      {isOddsBoardOpen && (
        <div className="fixed inset-0 z-[100] bg-background md:bg-black/80 md:backdrop-blur-sm flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-200">
          <div className="w-full h-full md:h-[85vh] max-w-6xl relative flex flex-col bg-card md:rounded-2xl shadow-2xl md:border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background">
              <h2 className="text-xl font-bold text-foreground m-0">Odds Board</h2>
              <button onClick={() => setIsOddsBoardOpen(false)} className="text-secondary hover:text-foreground bg-white/5 p-2 rounded-full border-none cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative flex">
               <div className="flex-1 h-full overflow-hidden md:border-r border-border">
                 <OddsBoard 
                   onAddSelection={handleAddSelection} 
                   onRemoveSelection={handleRemoveSelection}
                   activeSelectionIds={selections.map(s => s.id)}
                 />
               </div>
            </div>
            {selections.length > 0 && !isSlipDrawerOpen && (
               <button 
                 onClick={() => setIsSlipDrawerOpen(true)}
                 className="absolute bottom-6 right-6 z-[110] bg-primary text-primary-foreground border-none font-bold px-6 py-4 rounded-full shadow-[0_0_40px_rgba(204,255,0,0.3)] flex items-center gap-3 cursor-pointer"
               >
                 View Bet Slip
                 <span className="bg-black/20 px-2 py-0.5 rounded-full">{selections.length}</span>
               </button>
            )}
            <BetSlipDrawer 
              isOpen={isSlipDrawerOpen}
              onClose={() => setIsSlipDrawerOpen(false)}
              selections={selections}
              onRemoveSelection={handleRemoveSelection}
              onClear={() => setSelections([])}
              onSuccess={() => {
                setIsSlipDrawerOpen(false);
                setIsOddsBoardOpen(false);
                fetchPicks();
              }}
            />
          </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  );
}
