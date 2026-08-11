"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Activity, Lock, Unlock, TrendingUp, Users, Target, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import FeedSearch from "./FeedSearch";
import { calculateAnalystStats } from "@/lib/stats";

type PickWithAnalyst = {
  id: string;
  sport: string;
  match_title: string;
  selection: string;
  odds: number;
  stake: number;
  status: string;
  is_premium: boolean;
  game_start_time: string;
  created_at: string;
  analyst_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
};

export default function AnalystFeed() {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const [picks, setPicks] = useState<PickWithAnalyst[]>([]);
  const [myFollowerCount, setMyFollowerCount] = useState(0);
  const [myWinRate, setMyWinRate] = useState("0%");
  const [loading, setLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch global market picks securely via RPC
      const { data: picksData, error: picksError } = await supabase!
        .rpc("get_feed_picks")
        .limit(50);

      if (picksError) throw picksError;
      setPicks(picksData as unknown as PickWithAnalyst[]);

        // Fetch my followers
        const { count, error: subError } = await supabase!
          .from("follows")
          .select("*", { count: 'exact', head: true })
          .eq("following_id", user.id);
        
        if (subError) throw subError;
        setMyFollowerCount(count || 0);

        // Fetch my graded picks to calculate win rate
        const { data: myGradedPicks, error: gradedError } = await supabase!
          .from("picks")
          .select("status, stake, odds")
          .eq("analyst_id", user.id)
          .neq("status", "LOCKED");
          
        if (!gradedError && myGradedPicks) {
           const stats = calculateAnalystStats(myGradedPicks);
           setMyWinRate(`${stats.winRate}%`);
        }

      } catch (err) {
      console.error("Error fetching analyst feed data:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      fetchData();
      
      const interval = setInterval(() => {
        fetchData();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthLoading, user]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-muted-foreground">
        <Activity className="animate-pulse mb-4 text-primary" size={32} />
        <p className="text-sm font-medium">Loading Command Center...</p>
      </div>
    );
  }

  // Filter picks
  const myActivePicks = picks.filter(p => p.analyst_id === user?.id && p.status === "LOCKED");
  const marketPicks = picks.filter(p => p.analyst_id !== user?.id);

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col items-start justify-center space-y-2 mt-4 mb-6 border-b border-border pb-4 relative">
        <div className="flex items-center gap-3 w-full justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <TrendingUp size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Market Intelligence</h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Real-time ledger of timestamped positions.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FeedSearch />
            <button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-full border border-primary/20 transition-colors disabled:opacity-50"
            >
              <Activity size={14} className={isRefreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Live"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Performance Widget */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
            <Users size={18} className="text-secondary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Active Subscribers</p>
            <p className="text-xl font-bold text-foreground">{myFollowerCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Target size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">30-Day Win Rate</p>
            <p className="text-xl font-bold text-foreground">{myWinRate}</p>
          </div>
        </div>
      </div>

      {/* My Active Ledger */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 size={16} className="text-primary" />
          My Active Ledger
        </h2>
        <div className="space-y-4">
          {myActivePicks.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm font-bold text-foreground">No active positions</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">You have no open contracts on the ledger.</p>
              <Link href="/deck" className="text-xs font-bold text-primary hover:underline">
                Go to Deck to lock a pick &rarr;
              </Link>
            </div>
          ) : (
            myActivePicks.map((pick) => (
              <div key={pick.id} className="bg-card border border-primary/20 rounded-xl p-5 shadow-[0_0_15px_rgba(204,255,0,0.05)] relative overflow-hidden group">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Active</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border border-border">
                    {pick.is_premium ? (
                      <Lock size={12} className="text-primary" />
                    ) : (
                      <Unlock size={12} className="text-muted-foreground" />
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      {new Date(pick.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{pick.sport}</span>
                    <div className="flex items-center gap-2">
                      {pick.status === "WIN" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime/20 text-lime border border-lime/30">✅ WIN</span>}
                      {pick.status === "LOSS" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 border border-red-500/30">❌ LOSS</span>}
                      {pick.status === "PUSH" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate/20 text-slate border border-slate/30">➖ PUSH</span>}
                      {pick.status === "LOCKED" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">🔒 ACTIVE</span>}
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                        {pick.stake}U
                      </span>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-foreground truncate">{pick.match_title}</h3>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-secondary">{pick.selection}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-foreground">{pick.odds > 0 ? `+${pick.odds}` : pick.odds}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Market Consensus */}
      <div className="pt-4 border-t border-border">
        <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp size={16} className="text-secondary" />
          Market Consensus
        </h2>
        <div className="space-y-4">
          {marketPicks.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-xs">No recent market activity.</div>
          ) : (
            marketPicks.map((pick) => {
              // Blur logic for analysts looking at market picks
              // They must subscribe to see premium picks (unless we give them a pass, but user said blur)
              const isBlurred = pick.is_premium; 

              return (
                <div key={pick.id} className="bg-card border border-border rounded-xl p-5 shadow-lg relative overflow-hidden group">
                  {isBlurred && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-10 flex flex-col items-center justify-center border border-primary/20">
                      <Lock size={24} className="text-primary mb-2" />
                      <p className="text-sm font-bold text-foreground">Premium Contract</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Subscription required to view.</p>
                    </div>
                  )}

                <div className="flex justify-between items-start mb-3">
                  <Link href={`/analyst/${pick.profiles?.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-bold overflow-hidden border border-secondary/20">
                      {pick.profiles?.avatar_url ? (
                        <img src={pick.profiles.avatar_url} alt={pick.profiles.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-secondary">{pick.profiles?.username?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground">{pick.profiles?.username}</span>
                  </Link>
                  <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border border-border">
                    {pick.is_premium ? (
                      <Lock size={12} className="text-primary" />
                    ) : (
                      <Unlock size={12} className="text-muted-foreground" />
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      {new Date(pick.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{pick.sport}</span>
                    <div className="flex items-center gap-2">
                      {pick.status === "WIN" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime/20 text-lime border border-lime/30">✅ WIN</span>}
                      {pick.status === "LOSS" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 border border-red-500/30">❌ LOSS</span>}
                      {pick.status === "PUSH" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate/20 text-slate border border-slate/30">➖ PUSH</span>}
                      {pick.status === "LOCKED" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">🔒 ACTIVE</span>}
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                        {pick.stake}U
                      </span>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-foreground truncate">{pick.match_title}</h3>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-secondary">{pick.selection}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-foreground">{pick.odds > 0 ? `+${pick.odds}` : pick.odds}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

    </div>
  );
}
