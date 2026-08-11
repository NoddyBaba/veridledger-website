"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Users, Flame, Search, Filter } from "lucide-react";

type Capper = {
  id: string;
  name: string;
  role: string;
  winRate: string;
  roi: string;
  roiValue: number;
  followers: number;
};

export default function LeaderboardClient({ initialCappers }: { initialCappers: Capper[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSport, setActiveSport] = useState("All");

  const sports = ["All", "NBA", "NFL", "Soccer", "Tennis", "MMA"];

  const filteredCappers = initialCappers.filter((capper) => {
    // Search by username
    const matchesSearch = capper.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // In the future, we will check capper.sports or similar for the activeSport filter.
    // For now, "All" is active, or if they click another sport we just show all anyway (as a placeholder UI).
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Search & Filters */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors shadow-sm"
            placeholder="Search analysts by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Future Sports Filter (UI Only for now) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-1.5 text-muted-foreground px-2">
            <Filter size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Sport</span>
          </div>
          {sports.map((sport) => (
            <button
              key={sport}
              onClick={() => setActiveSport(sport)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeSport === sport
                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(204,255,0,0.2)]"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border"
              }`}
            >
              {sport}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Trophy size={16} className="text-secondary" />
            Top Analysts
          </h2>
          <span className="text-xs text-muted-foreground font-medium">{filteredCappers.length} Results</span>
        </div>
        
        <div className="divide-y divide-border">
          {filteredCappers.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <Search size={32} className="text-muted-foreground mb-4 opacity-50" />
              <p className="text-foreground font-bold mb-1">No analysts found</p>
              <p className="text-muted-foreground text-sm">Try adjusting your search query.</p>
            </div>
          )}
          {filteredCappers.map((capper, index) => (
            <Link href={`/analyst/${capper.name}`} key={capper.id}>
              <div className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  index === 0 && searchQuery === "" ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(204,255,0,0.5)]" : 
                  index === 1 && searchQuery === "" ? "bg-secondary text-secondary-foreground" : 
                  index === 2 && searchQuery === "" ? "bg-orange-500 text-white" : 
                  "bg-muted text-muted-foreground"
                }`}>
                  {searchQuery === "" ? `#${index + 1}` : "-"}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{capper.name}</h3>
                    {index === 0 && searchQuery === "" && <Flame size={14} className="text-orange-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1 font-medium">
                    <span className="flex items-center gap-1"><Users size={12}/> {capper.followers} Allocators</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-sm font-bold ${capper.roiValue > 0 ? "text-primary" : capper.roiValue < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {capper.roi} ROI
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-medium">{capper.winRate} Win Rate</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
