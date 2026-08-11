import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import StickyFeatures from "@/components/landing/StickyFeatures";
import Leaderboard from "@/components/landing/Leaderboard";
import Footer from "@/components/landing/Footer";

import { createClient } from "@supabase/supabase-js";
import { calculateAnalystStats } from "@/lib/stats";
import type { LandingLeaderboardRow } from "@/components/landing/Leaderboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to count premium picks!
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: analystsData } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("role", "analyst");

  const { data: picksData } = await supabase
    .from("picks")
    .select("analyst_id, stake, odds, status")
    .neq("status", "LOCKED");

  const analysts = analystsData || [];
  const picks = (picksData || []) as any[];

  const topCappers: LandingLeaderboardRow[] = analysts.map((analyst, index) => {
    const analystPicks = picks.filter((p) => p.analyst_id === analyst.id);
    const stats = calculateAnalystStats(analystPicks);

    return {
      rank: 0, // will assign after sorting
      handle: analyst.username,
      focus: "General",
      roi: stats.roi,
      yield: stats.netUnits,
      winRate: stats.winRate,
    };
  });

  topCappers.sort((a, b) => b.roi - a.roi);
  topCappers.forEach((capper, i) => capper.rank = i + 1);

  return (
    <main className="relative bg-obsidian selection:bg-lime/30 text-ink">
      <Navbar />
      <Hero />
      <StickyFeatures />
      <Leaderboard data={topCappers.slice(0, 5)} />
      <Footer />
    </main>
  );
}
