"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import BottomNav from '@/components/BottomNav';
import { supabase } from "@/lib/supabase";
import { Shield, Check, X, Minus, Activity, Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type Pick = {
  id: string;
  analyst_id: string;
  sport: string;
  match_title: string;
  selection: string;
  odds: number;
  stake: number;
  status: "LOCKED" | "WIN" | "LOSS" | "PUSH";
  game_start_time: string;
  created_at: string;
  profiles: {
    username: string;
  };
};

export default function OraclePage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    
    // @ts-ignore - is_admin might not be on the Profile type yet, but we will check it safely
    if (!user || !profile || profile.is_admin !== true) {
      router.push("/");
      return;
    }

    fetchPendingPicks();
  }, [user, profile, isLoading, router]);

  const fetchPendingPicks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase!
        .from("picks")
        .select(`
          *,
          profiles:analyst_id (username)
        `)
        .eq("status", "LOCKED")
        .order("game_start_time", { ascending: true });

      if (error) throw error;
      
      // Filter out games that haven't started yet (can't grade them)
      const gradablePicks = (data as any[]).filter(
        (p) => new Date(p.game_start_time).getTime() < Date.now()
      );
      
      setPicks(gradablePicks);
    } catch (error) {
      console.error("Error fetching picks:", error);
    } finally {
      setLoading(false);
    }
  };

  const gradePick = async (id: string, status: "WIN" | "LOSS" | "PUSH") => {
    if (!confirm(`Are you sure you want to grade this pick as ${status}? This action is immutable.`)) return;
    
    setProcessingId(id);
    try {
      const { error } = await supabase!
        .from("picks")
        .update({ status })
        .eq("id", id);
        
      if (error) throw error;
      
      // Remove from list
      setPicks(picks.filter(p => p.id !== id));
      
    } catch (error: any) {
      console.error("Error grading pick:", error);
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center justify-center text-center space-y-3 mt-4 mb-8">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <Shield size={32} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">The Oracle</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto font-medium">Administrator Grading Panel. These actions directly update the global immutable ledger.</p>
        </div>
      </div>

      {picks.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <Activity size={48} className="text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-bold text-foreground">No Pending Grades</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">All concluded games have been graded or there are no games that have started yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {picks.map((pick) => (
            <div key={pick.id} className="bg-card border border-border rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Link href={`/analyst/${pick.profiles.username}`} className="text-xs font-bold text-primary hover:underline">
                      @{pick.profiles.username}
                    </Link>
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                      {pick.sport}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> Started {dayjs(pick.game_start_time).fromNow()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{pick.match_title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-medium text-foreground">{pick.selection.replace(/\((\d+\.\d{3,})\)/g, (m: string, p1: string) => `(${Number(p1).toFixed(2)})`)}</span>
                    <span className="text-sm font-bold text-secondary">{Number(pick.odds).toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground font-medium">• {pick.stake}U Stake</span>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                  <button 
                    onClick={() => gradePick(pick.id, "WIN")}
                    disabled={processingId !== null}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-green-500/10 text-green-500 border border-green-500/20 px-4 py-2 rounded-lg font-bold hover:bg-green-500 hover:text-white transition-all text-xs"
                  >
                    <Check size={14} /> WIN
                  </button>
                  <button 
                    onClick={() => gradePick(pick.id, "LOSS")}
                    disabled={processingId !== null}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-all text-xs"
                  >
                    <X size={14} /> LOSS
                  </button>
                  <button 
                    onClick={() => gradePick(pick.id, "PUSH")}
                    disabled={processingId !== null}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-muted text-muted-foreground border border-border px-4 py-2 rounded-lg font-bold hover:bg-muted-foreground hover:text-background transition-all text-xs"
                  >
                    <Minus size={14} /> PUSH
                  </button>
                </div>
                
              </div>
            </div>
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  );
}