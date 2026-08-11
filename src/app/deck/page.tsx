"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, DollarSign, TrendingUp, Target, Flame, Plus, Lock, X } from "lucide-react";
import OddsBoard, { OddSelection } from "@/components/OddsBoard";
import BetSlipDrawer from "@/components/BetSlipDrawer";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type PickRow = {
  id: string;
  sport: string;
  match_title: string;
  selection: string;
  odds: number;
  stake: number;
  status: "LOCKED" | "WIN" | "LOSS" | "PUSH";
  is_premium: boolean;
  game_start_time: string;
  created_at: string;
};

export default function AnalystDeck() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();

  const [isOddsBoardOpen, setIsOddsBoardOpen] = useState(false);
  const [isSlipDrawerOpen, setIsSlipDrawerOpen] = useState(false);
  const [selections, setSelections] = useState<OddSelection[]>([]);
  
  const [filter, setFilter] = useState<"All" | "LOCKED" | "GRADED">("All");
  
  const [picks, setPicks] = useState<PickRow[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loadingPicks, setLoadingPicks] = useState(true);

  const fetchPicks = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase!
        .from("picks")
        .select("*")
        .eq("analyst_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPicks(data as PickRow[]);

      const { count, error: subError } = await supabase!
        .from("subscriptions")
        .select("*", { count: 'exact', head: true })
        .eq("analyst_id", user.id)
        .eq("status", "active");
      
      if (!subError) {
        setSubscriberCount(count || 0);
      }
    } catch (err) {
      console.error("Error fetching picks:", err);
    } finally {
      setLoadingPicks(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading) {
      if (!user || profile?.role !== "analyst") {
        router.push("/auth");
      } else {
        fetchPicks();
      }
    }
  }, [user, profile, isLoading, router, fetchPicks]);

  // Derived Performance Data
  const calculateStats = () => {
    const gradedPicks = picks.filter(p => p.status === "WIN" || p.status === "LOSS");
    const wins = gradedPicks.filter(p => p.status === "WIN").length;
    
    let totalUnitsStaked = 0;
    let totalNetUnits = 0;

    gradedPicks.forEach(p => {
      totalUnitsStaked += p.stake;
      if (p.status === "WIN") {
        let profit = 0;
        if (p.odds > 0) {
          profit = p.stake * (p.odds / 100);
        } else if (p.odds < 0) {
          profit = p.stake * (100 / Math.abs(p.odds));
        }
        totalNetUnits += profit;
      } else if (p.status === "LOSS") {
        totalNetUnits -= p.stake;
      }
    });

    const winRate = gradedPicks.length > 0 ? ((wins / gradedPicks.length) * 100).toFixed(1) + "%" : "0.0%";
    const roi = totalUnitsStaked > 0 ? ((totalNetUnits / totalUnitsStaked) * 100).toFixed(1) + "%" : "0.0%";
    const roiPrefix = totalNetUnits > 0 ? "+" : "";

    // Assuming a ₦2500/mo subscription for MRR calculation
    const mrr = subscriberCount * 2500;

    return {
      subscribers: subscriberCount,
      mrr: mrr,
      roi: `${roiPrefix}${roi}`,
      winRate: winRate,
      streak: gradedPicks.length > 0 ? "TBD" : "0"
    };
  };

  const stats = calculateStats();

  const filteredPicks = picks.filter(pick => {
    if (filter === "LOCKED") return pick.status === "LOCKED";
    if (filter === "GRADED") return pick.status !== "LOCKED";
    return true;
  });

  const handleAddSelection = (selection: OddSelection) => {
    if (!selections.find(s => s.id === selection.id)) {
      setSelections([...selections, selection]);
      setIsSlipDrawerOpen(true);
    }
  };

  const handleRemoveSelection = (id: string) => {
    setSelections(selections.filter(s => s.id !== id));
  };

  if (isLoading || loadingPicks) {
    return <div className="min-h-screen p-6 flex items-center justify-center text-muted-foreground">Loading Deck...</div>;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analyst Deck</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your ledger and subscribers.</p>
        </div>
        <button 
          onClick={() => {
            setIsOddsBoardOpen(true);
            if (selections.length > 0) setIsSlipDrawerOpen(true);
          }}
          className="bg-primary text-primary-foreground font-bold px-4 py-2.5 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(204,255,0,0.15)]"
        >
          <Plus size={18} strokeWidth={3} />
          <span className="hidden sm:inline">Timestamp Position</span>
          <span className="sm:hidden">Pick</span>
        </button>
      </div>

      {/* Overview Stats (Audience/Revenue) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 opacity-50">
          <div className="bg-secondary/10 p-3 rounded-lg text-secondary">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Subscribers</p>
            <p className="text-2xl font-bold text-foreground">{stats.subscribers}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 opacity-50">
          <div className="bg-primary/10 p-3 rounded-lg text-primary">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Est. MRR</p>
            <p className="text-2xl font-bold text-foreground">₦{stats.mrr.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-secondary" />
          Proof Engine Metrics
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg">
            <TrendingUp size={18} className={`${stats.roi.startsWith("+") && stats.roi !== "+0.0%" ? "text-primary" : "text-muted-foreground"} mb-1`} />
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total ROI</p>
            <p className={`text-lg font-bold ${stats.roi.startsWith("+") && stats.roi !== "+0.0%" ? "text-primary" : "text-foreground"}`}>{stats.roi}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg">
            <Target size={18} className="text-secondary mb-1" />
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Win Rate</p>
            <p className="text-lg font-bold text-foreground">{stats.winRate}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg">
            <Flame size={18} className="text-orange-500 mb-1" />
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Streak</p>
            <p className="text-lg font-bold text-foreground">{stats.streak}</p>
          </div>
        </div>
      </div>

      {/* Recent Picks Ledger */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Ledger</h2>
          <div className="flex bg-background border border-border rounded-lg p-0.5">
            {["All", "LOCKED", "GRADED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={`px-3 py-1 text-[10px] font-bold tracking-wider rounded-md transition-colors ${
                  filter === tab 
                    ? "bg-card text-foreground shadow-sm border border-border" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
          <div className="divide-y divide-border">
            {filteredPicks.map((pick) => (
              <div key={pick.id} className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{pick.selection}</span>
                    <span className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                      {pick.odds > 0 ? `+${pick.odds}` : pick.odds}
                    </span>
                    {pick.is_premium && (
                      <span className="text-[9px] bg-primary/10 text-primary uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock size={8}/> Premium
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {pick.sport} • {pick.match_title} • {pick.stake}U
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm ${
                    pick.status === "WIN" ? "text-primary bg-primary/10 border border-primary/20" :
                    pick.status === "LOSS" ? "text-red-500 bg-red-500/10 border border-red-500/20" :
                    pick.status === "LOCKED" ? "text-secondary bg-secondary/10 border border-secondary/20" :
                    "text-muted-foreground bg-muted border border-border"
                  }`}>
                    {pick.status}
                  </span>
                  <div className="text-[9px] text-muted-foreground mt-1">
                    {new Date(pick.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {filteredPicks.length === 0 && (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                <Lock size={32} className="text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm font-medium">No picks found in the ledger.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {isOddsBoardOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-8 animate-in fade-in duration-200">
          <div className="w-full h-full sm:h-[85vh] max-w-6xl relative flex flex-col bg-card sm:rounded-xl shadow-2xl border border-border overflow-hidden">
            {/* Header with Close */}
            <div className="p-4 border-b border-border flex justify-between items-center bg-background">
              <h2 className="text-xl font-bold text-foreground">Odds Board</h2>
              <button onClick={() => setIsOddsBoardOpen(false)} className="text-muted-foreground hover:text-foreground bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden relative flex">
               <div className="flex-1 h-full overflow-hidden border-r border-border">
                 <OddsBoard onAddSelection={handleAddSelection} />
               </div>
            </div>
            
            {/* Floating Bet Slip Indicator (if selections exist and drawer is closed) */}
            {selections.length > 0 && !isSlipDrawerOpen && (
               <button 
                 onClick={() => setIsSlipDrawerOpen(true)}
                 className="absolute bottom-6 right-6 z-50 bg-primary text-primary-foreground font-bold px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-bounce hover:bg-primary/90"
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

    </div>
  );
}
