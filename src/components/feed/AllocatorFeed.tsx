"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Activity, Lock, Unlock, TrendingUp } from "lucide-react";
import Link from "next/link";
import FeedSearch from "./FeedSearch";
import ReactionActionBar from "./ReactionActionBar";

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

export default function AllocatorFeed() {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const [picks, setPicks] = useState<PickWithAnalyst[]>([]);
  const [subscribedAnalysts, setSubscribedAnalysts] = useState<any[]>([]);
  const [followedAnalysts, setFollowedAnalysts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch the 50 most recent picks securely via RPC (Server-Side Masking)
      const { data: picksData, error: picksError } = await supabase!
        .rpc("get_feed_picks")
        .limit(50);

      if (picksError) throw picksError;
      setPicks(picksData as unknown as PickWithAnalyst[]);

      if (user) {
        // Fetch subscriptions for this user
        const { data: subData, error: subError } = await supabase!
          .from("subscriptions")
          .select(`
            analyst_id,
            profiles:analyst_id (username, avatar_url)
          `)
          .eq("allocator_id", user.id)
          .eq("status", "active");
        
        if (subError) throw subError;
        setSubscribedAnalysts(subData || []);

        // Fetch follows for this user
        const { data: followData, error: followError } = await supabase!
          .from("follows")
          .select(`
            following_id,
            profiles:following_id (username, avatar_url)
          `)
          .eq("follower_id", user.id);
        
        if (followError) throw followError;
        setFollowedAnalysts(followData || []);
      }

    } catch (err) {
      console.error("Error fetching feed data:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      fetchData();
      
      // Auto-poll every 15 seconds to stay synced with the Oracle
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
        <p className="text-sm font-medium">Syncing Ledger Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24 space-y-6 animate-in fade-in duration-500">
      
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

      {/* Subscribed Analysts (My Analysts) */}
      {followedAnalysts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3 px-1">My Analysts</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {followedAnalysts.map((sub) => (
              <Link key={sub.following_id} href={`/analyst/${sub.profiles?.username}`} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
                <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center text-sm font-bold overflow-hidden border-2 border-transparent group-hover:border-primary transition-colors">
                  {sub.profiles?.avatar_url ? (
                    <img src={sub.profiles.avatar_url} alt={sub.profiles.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-secondary">{sub.profiles?.username?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors max-w-[60px] truncate text-center">
                  {sub.profiles?.username}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Feed Content */}
      <div className="space-y-4">
        {picks.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-lg mt-10">
            <TrendingUp className="mx-auto text-primary/50 mb-4" size={40} />
            <h2 className="text-lg font-bold text-foreground mb-2">
              {followedAnalysts.length > 0 ? "Waiting for Signals" : "Your Ledger is Empty"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              {followedAnalysts.length > 0 
                ? "The analysts you follow haven't locked any new positions yet." 
                : "Discover top-performing analysts on the Leaderboard or search for your favorites to start receiving verified picks."}
            </p>
            {followedAnalysts.length === 0 && (
              <Link 
                href="/leaderboard"
                className="inline-flex items-center justify-center bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-full shadow-[0_0_15px_rgba(204,255,0,0.2)] hover:scale-[1.02] transition-transform"
              >
                Discover Analysts
              </Link>
            )}
          </div>
        ) : (
          picks.map((pick) => {
            const isAuthor = user?.id === pick.analyst_id;
            const isSubscribed = subscribedAnalysts.some(s => s.analyst_id === pick.analyst_id);
            const isBlurred = pick.is_premium && !isAuthor && !isSubscribed;

            return (
              <div key={pick.id} className="bg-card border border-border rounded-xl p-5 shadow-lg relative overflow-hidden group">
                {/* Premium Lock Overlay for unauthorized users */}
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
                  <span className="text-muted-foreground">@</span>
                  <span className="text-foreground">{pick.odds > 0 ? `+${pick.odds}` : pick.odds}</span>
                </div>
              </div>

              <ReactionActionBar pickId={pick.id} hasAccess={!isBlurred} />
            </div>
          );
        })
      )}
      </div>

    </div>
  );
}
