import { Shield } from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { calculateAnalystStats } from "@/lib/stats";
import DiscoveryLeaderboard, { CapperData } from "@/components/DiscoveryLeaderboard";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to count premium picks!
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all analysts
  const { data: analystsData } = await supabase
    .from("profiles")
    .select("id, username, primary_focus")
    .eq("role", "analyst");

  // Fetch all graded picks chronologically for accurate equity curve
  const { data: picksData } = await supabase
    .from("picks")
    .select("analyst_id, stake, odds, status, sport, created_at")
    .neq("status", "LOCKED")
    .order("created_at", { ascending: true });

  const analysts = analystsData || [];
  const picks = (picksData || []) as any[];

  const topCappers: CapperData[] = analysts.map((analyst) => {
    const analystPicks = picks.filter((p) => p.analyst_id === analyst.id);
    const stats = calculateAnalystStats(analystPicks);
    
    // Auto-verify: Minimum 50 graded picks AND win rate over 55%
    const isVerified = stats.totalGraded >= 50 && stats.winRate > 55;

    return {
      id: analyst.id,
      name: analyst.username,
      handle: analyst.username, // Using username as handle
      category: analyst.primary_focus || stats.category, // Prefer DB column, fallback to dynamic
      verified: isVerified,
      winRate: stats.winRate,
      roi: stats.roi,
      yield: stats.netUnits,
      averageOdds: stats.averageOdds,
      trend: stats.trend
    };
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-3 mt-4 mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(204,255,0,0.15)]">
          <Shield size={32} className="text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Global Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto font-medium">Cryptographically verified yields. Only the most profitable analysts survive the ledger.</p>
        </div>
      </div>

      <DiscoveryLeaderboard analysts={topCappers} />

    </div>
  );
}
