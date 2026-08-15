"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import FeedHeader from "./FeedHeader";
import PickCard from "./PickCard";
import { calculateAnalystStats } from "@/lib/stats";

export default function AllocatorFeed() {
  const { user } = useAuth();
  const [picks, setPicks] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPicks() {
      // 1. Fetch ALL picks order by game_start_time desc
      const { data: picksData, error: picksError } = await supabase
        .from("picks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
        
      if (picksError || !picksData) return;

      // 2. Fetch profiles
      const analystIds = Array.from(new Set(picksData.map(p => p.analyst_id)));
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", analystIds);

      // 3. Fetch past picks to calculate WR dynamically
      const { data: pastPicks } = await supabase
        .from("picks")
        .select("analyst_id, status, odds, stake")
        .in("status", ["WIN", "LOSS"])
        .in("analyst_id", analystIds);

      const map: Record<string, any> = {};
      profilesData?.forEach(p => {
        const pPicks = pastPicks?.filter(x => x.analyst_id === p.id) || [];
        const stats = calculateAnalystStats(pPicks);
        map[p.id] = { ...p, win_rate: stats.winRate };
      });

      setPicks(picksData);
      setProfileMap(map);
      setLoading(false);
    }
    fetchPicks();
  }, []);

  const filteredPicks = picks.filter(pick => {
    // 1. Live Filter
    if (isLive && pick.status !== 'LOCKED') return false;
    
    // 2. Search Filter
    const prof = profileMap[pick.analyst_id];
    if (searchQuery && prof && !prof.username.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto px-5 md:px-10 py-7 pb-20 custom-scroll">
        <FeedHeader 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          isLive={isLive} 
          setIsLive={setIsLive} 
        />
        
        {loading ? (
          <div className="text-secondary text-sm">Loading market intelligence...</div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filteredPicks.map(pick => (
              <PickCard key={pick.id} pick={pick} profileMap={profileMap} />
            ))}
            {filteredPicks.length === 0 && (
              <div className="text-center py-16 text-secondary">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mx-auto mb-2 text-tertiary"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
                <h3 className="m-0 text-[15px] font-bold text-foreground">No matches found</h3>
                <p className="m-0 text-[13px] mt-1">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
