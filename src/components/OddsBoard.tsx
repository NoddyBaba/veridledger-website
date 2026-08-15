"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Link as LinkIcon, X, ChevronRight, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

export type OddSelection = {
  id: string;
  gameId: string;
  sport: string;
  matchTitle: string;
  type: 'ml' | 'spread' | 'total' | 'prop';
  selectionName: string;
  odds: number;
  startTime: string;
  metadata?: any;
};

type Game = {
  id: string;
  sport: string;
  title: string;
  startTime: string;
  isSoccer: boolean;
  markets: {
    ml: { 
      home: { name: string, odds: number }, 
      away: { name: string, odds: number },
      draw?: { name: 'Draw', odds: number }
    },
    total: { 
      over: { line: string, odds: number }, 
      under: { line: string, odds: number } 
    },
    // We keep spread for non-soccer in the details view, but omit from main table to save space
    spread: {
      home: { name: string, line: string, odds: number },
      away: { name: string, line: string, odds: number }
    }
  },
  rawOdds: any // Keeping raw odds to pass to the Match Details modal later
};

// Helper to normalize American odds to Decimal if the API glitches
function normalizeOdds(odds: number | string): number {
  const o = parseFloat(odds as string);
  if (isNaN(o) || o === 0) return 0;
  if (o >= 100) return (o / 100) + 1;
  if (o <= -100) return (100 / Math.abs(o)) + 1;
  return o;
}

function parseApiFootballEvent(eventRow: any): Game | null {
  const data = eventRow.odds_data;
  const bookmaker = data.bookmakers?.[0]; // Usually bet365 or 1xBet
  if (!bookmaker) return null;

  const matchWinner = bookmaker.markets.find((m: any) => m.id === 1 || m.name === "Match Winner");
  const goalsOverUnder = bookmaker.markets.find((m: any) => m.id === 5 || m.name === "Goals Over/Under");

  const getVal = (market: any, valStr: string) => {
    const v = market?.values?.find((v: any) => v.value === valStr);
    return v ? normalizeOdds(v.odd) : 0;
  };

  // Often the default Over/Under line is 2.5 in soccer. We search for the 2.5 values.
  const over25 = goalsOverUnder?.values?.find((v: any) => v.value === "Over 2.5")?.odd;
  const under25 = goalsOverUnder?.values?.find((v: any) => v.value === "Under 2.5")?.odd;

  return {
    id: eventRow.id,
    sport: 'Football',
    title: `${eventRow.home_team} vs ${eventRow.away_team}`,
    startTime: eventRow.commence_time,
    isSoccer: true,
    rawOdds: data,
    markets: {
      ml: {
        home: { name: eventRow.home_team, odds: getVal(matchWinner, "Home") },
        draw: { name: "Draw", odds: getVal(matchWinner, "Draw") },
        away: { name: eventRow.away_team, odds: getVal(matchWinner, "Away") }
      },
      total: {
        over: { line: "O 2.5", odds: over25 ? normalizeOdds(over25) : 0 },
        under: { line: "U 2.5", odds: under25 ? normalizeOdds(under25) : 0 }
      },
      spread: { home: { name: "", line: "", odds: 0 }, away: { name: "", line: "", odds: 0 } }
    }
  };
}

function parseTheOddsApiEvent(eventRow: any): Game | null {
  const data = eventRow.odds_data;
  const bookmaker = data.bookmakers?.find((b: any) => b.key === 'draftkings') || 
                    data.bookmakers?.find((b: any) => b.key === 'fanduel') || 
                    data.bookmakers?.[0];
                    
  if (!bookmaker) return null; 

  const h2h = bookmaker.markets.find((m: any) => m.key === 'h2h');
  const spreads = bookmaker.markets.find((m: any) => m.key === 'spreads');
  const totals = bookmaker.markets.find((m: any) => m.key === 'totals');

  const getOutcome = (market: any, nameMatcher: (name: string) => boolean) => {
    return market?.outcomes?.find((o: any) => nameMatcher(o.name)) || { price: 0, point: 0 };
  };

  const homeH2H = getOutcome(h2h, (n) => n === data.home_team);
  const awayH2H = getOutcome(h2h, (n) => n === data.away_team);
  const drawH2H = getOutcome(h2h, (n) => n === 'Draw');
  
  const homeSpread = getOutcome(spreads, (n) => n === data.home_team);
  const awaySpread = getOutcome(spreads, (n) => n === data.away_team);
  
  const overTotal = getOutcome(totals, (n) => n.toLowerCase() === 'over');
  const underTotal = getOutcome(totals, (n) => n.toLowerCase() === 'under');

  const isSoccer = data.sport_key.toLowerCase().includes('soccer');
  let sportName = data.sport_title;
  if (data.sport_key.toLowerCase().includes('americanfootball') || data.sport_key.toLowerCase().includes('nfl') || data.sport_key.toLowerCase().includes('ncaa')) {
    sportName = "American Football";
  }

  return {
    id: eventRow.id,
    sport: sportName,
    title: `${data.home_team} vs ${data.away_team}`, // Changed to Home vs Away
    startTime: data.commence_time,
    isSoccer,
    rawOdds: data,
    markets: {
      ml: {
        home: { name: data.home_team, odds: normalizeOdds(homeH2H.price) },
        away: { name: data.away_team, odds: normalizeOdds(awayH2H.price) },
        ...(isSoccer ? { draw: { name: 'Draw', odds: normalizeOdds(drawH2H.price) } } : {})
      },
      spread: {
        home: { name: data.home_team, line: homeSpread.point !== undefined && homeSpread.point > 0 ? `+${homeSpread.point}` : `${homeSpread.point || ''}`, odds: normalizeOdds(homeSpread.price) },
        away: { name: data.away_team, line: awaySpread.point !== undefined && awaySpread.point > 0 ? `+${awaySpread.point}` : `${awaySpread.point || ''}`, odds: normalizeOdds(awaySpread.price) }
      },
      total: {
        over: { line: overTotal.point ? `O ${overTotal.point}` : '', odds: normalizeOdds(overTotal.price) },
        under: { line: underTotal.point ? `U ${underTotal.point}` : '', odds: normalizeOdds(underTotal.price) }
      }
    }
  };
}

const OddsCell = ({ price, onClick, isActive }: { price: number, onClick?: () => void, isActive?: boolean }) => {
  if (price === 0) {
    return (
      <div className="flex items-center justify-center h-10 w-full rounded border border-dashed border-border bg-transparent">
        <span className="text-xs font-semibold text-muted-foreground">—</span>
      </div>
    );
  }
  return (
    <button 
      onClick={onClick}
      className={`flex items-center justify-center h-10 w-full rounded border transition-colors cursor-pointer group ${isActive ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/10 focus:ring-2 focus:ring-primary'}`}
    >
      <span className="text-[12px] font-bold font-mono">{price.toFixed(2)}</span>
    </button>
  );
};

export default function OddsBoard({ onAddSelection }: { onAddSelection: (selection: OddSelection) => void }) {
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("All");
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareLink, setShareLink] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  
  // Track selected active odds for visual feedback
  const [activeSelections, setActiveSelections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchLiveEvents = async () => {
      setIsLoading(true);
      const { data, error } = await supabase!
        .from('live_events')
        .select('*')
        .order('commence_time', { ascending: true });

      if (!error && data) {
        const parsedGames = data.map(row => {
          if (row.sport_key === 'soccer_api_football') return parseApiFootballEvent(row);
          return parseTheOddsApiEvent(row);
        }).filter((g): g is Game => g !== null);
        setLiveGames(parsedGames);
      }
      setIsLoading(false);
    };

    fetchLiveEvents();
  }, []);

  const getDynamicSports = () => {
    const categories = new Set<string>();
    liveGames.forEach(g => {
      const s = g.sport.toLowerCase();
      if (s.includes("american football") || s.includes("nfl") || s.includes("ncaa")) categories.add("American Football");
      else if (s.includes("basketball") || s.includes("nba")) categories.add("Basketball");
      else if (s.includes("football") || s.includes("soccer") || s.includes("epl") || s.includes("fifa")) categories.add("Football");
      else if (s.includes("tennis") || s.includes("atp") || s.includes("wta")) categories.add("Tennis");
      else if (s.includes("baseball") || s.includes("mlb")) categories.add("Baseball");
      else if (s.includes("mma") || s.includes("ufc")) categories.add("MMA");
      else categories.add(g.sport); 
    });
    
    // Sort array but force "Football" to be first
    const sorted = Array.from(categories).sort();
    const footballIndex = sorted.indexOf("Football");
    if (footballIndex > -1) {
      sorted.splice(footballIndex, 1);
      sorted.unshift("Football");
    }
    return ["All", ...sorted];
  };

  const filterByGenericSport = (gameSport: string, filter: string) => {
    if (filter === "All") return true;
    const s = gameSport.toLowerCase();
    
    if (filter === "American Football") return s.includes("american football") || s.includes("nfl") || s.includes("ncaa") || s.includes("afl");
    if (filter === "Basketball") return s.includes("nba") || s.includes("basketball") || s.includes("wnba");
    if (filter === "Football") return s.includes("football") || s.includes("soccer") || s.includes("epl") || s.includes("fifa");
    if (filter === "Tennis") return s.includes("tennis") || s.includes("atp") || s.includes("wta");
    if (filter === "Baseball") return s.includes("mlb") || s.includes("baseball") || s.includes("npb") || s.includes("kbo");
    if (filter === "MMA") return s.includes("mma") || s.includes("ufc");
    
    return gameSport === filter; 
  };

  const filteredGames = liveGames.filter(g => 
    filterByGenericSport(g.sport, sportFilter) &&
    (g.title.toLowerCase().includes(search.toLowerCase()) || g.sport.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOddClick = (game: Game, type: OddSelection['type'], selectionName: string, odds: number, metadata: any) => {
    if (odds === 0) return;
    
    const uniqueId = `${game.id}-${type}-${selectionName.replace(/\s+/g, '')}`;
    
    // Visual toggle
    const newActive = new Set(activeSelections);
    if (newActive.has(uniqueId)) newActive.delete(uniqueId);
    else newActive.add(uniqueId);
    setActiveSelections(newActive);

    onAddSelection({
      id: uniqueId,
      gameId: game.id,
      sport: game.sport,
      matchTitle: game.title,
      type,
      selectionName,
      odds,
      startTime: game.startTime,
      metadata
    });
  };

  const availableSports = getDynamicSports();

  return (
    <div className="w-full h-full flex flex-col bg-background/50 border border-border rounded-xl overflow-hidden shadow-xl">
      
      {/* Top Search & Tabs */}
      <div className="p-4 border-b border-border bg-card flex flex-col xl:flex-row gap-3 items-center">
        <div className="relative w-full xl:max-w-[280px] flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text" 
            placeholder="Search teams, players, or events..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted/40 border border-border rounded-full pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-primary focus:bg-muted/80 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-border rounded-full p-0.5">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 hide-scrollbar bg-muted/30 p-1 rounded-full border border-border">
          {availableSports.map(sport => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                sportFilter === sport ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {sport}
            </button>
          ))}
          {availableSports.length === 0 && <span className="text-xs text-muted-foreground px-4 py-1.5">Waiting for data...</span>}
        </div>
      </div>

      {/* Main Odds Area - Horizontal Layout */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-muted-foreground text-sm font-medium">Fetching Live Oracle Data...</p>
          </div>
        )}

        {!isLoading && filteredGames.length === 0 && (
          <div className="text-center p-12 border border-dashed border-border rounded-xl m-4 bg-card">
            <p className="text-muted-foreground font-medium">No live markets available.</p>
            <p className="text-xs text-muted-foreground mt-2">Check back later or adjust filters.</p>
          </div>
        )}

        {/* Dense Table Header */}
        {!isLoading && filteredGames.length > 0 && (
          <div className="sticky top-0 z-10 grid grid-cols-[1fr_repeat(5,minmax(60px,70px))_30px] sm:grid-cols-[2fr_repeat(5,minmax(60px,80px))_40px] gap-1.5 items-center px-4 py-2 border-b border-border bg-card/95 backdrop-blur text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <div>Match</div>
            <div className="text-center">1</div>
            <div className="text-center">X</div>
            <div className="text-center">2</div>
            <div className="text-center" title="Over 2.5">O</div>
            <div className="text-center" title="Under 2.5">U</div>
            <div></div>
          </div>
        )}

        {!isLoading && filteredGames.map(game => {
          const isLive = new Date(game.startTime).getTime() < Date.now();
          const d = new Date(game.startTime);
          const timeStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;

          // Check if we should disable X (draw) for sports that typically don't have it
          const disableDraw = !game.isSoccer && !game.markets.ml.draw;

          return (
            <div key={game.id} className="grid grid-cols-[1fr_repeat(5,minmax(60px,70px))_30px] sm:grid-cols-[2fr_repeat(5,minmax(60px,80px))_40px] gap-1.5 items-center px-4 py-2.5 border-b border-border hover:bg-muted/10 transition-colors group">
              
              {/* Match Column */}
              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5 mb-1">
                  {isLive ? (
                    <span className="flex items-center gap-1 text-[9px] font-extrabold tracking-widest text-red-500 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">{timeStr}</span>
                  )}
                  <span className="text-[9px] text-muted-foreground bg-border/50 px-1.5 rounded uppercase truncate max-w-[80px]">{game.sport}</span>
                </div>
                
                {/* Home vs Away */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold truncate text-foreground/90">{game.markets.ml.home.name}</span>
                  <span className="text-[13px] font-semibold truncate text-foreground/90">{game.markets.ml.away.name}</span>
                </div>
              </div>

              {/* 1 X 2 */}
              <OddsCell 
                price={game.markets.ml.home.odds} 
                isActive={activeSelections.has(`${game.id}-ml-${game.markets.ml.home.name}Winner`)}
                onClick={() => handleOddClick(game, 'ml', `${game.markets.ml.home.name} Winner`, game.markets.ml.home.odds, { team: game.markets.ml.home.name })}
              />
              <div className={disableDraw ? "opacity-30 pointer-events-none" : ""}>
                <OddsCell 
                  price={game.markets.ml.draw?.odds || 0} 
                  isActive={activeSelections.has(`${game.id}-ml-Draw`)}
                  onClick={() => handleOddClick(game, 'ml', 'Draw', game.markets.ml.draw?.odds || 0, { team: 'Draw' })}
                />
              </div>
              <OddsCell 
                price={game.markets.ml.away.odds} 
                isActive={activeSelections.has(`${game.id}-ml-${game.markets.ml.away.name}Winner`)}
                onClick={() => handleOddClick(game, 'ml', `${game.markets.ml.away.name} Winner`, game.markets.ml.away.odds, { team: game.markets.ml.away.name })}
              />

              {/* Over / Under */}
              <OddsCell 
                price={game.markets.total.over.odds} 
                isActive={activeSelections.has(`${game.id}-total-${game.markets.total.over.line}`)}
                onClick={() => handleOddClick(game, 'total', game.markets.total.over.line || 'Over', game.markets.total.over.odds, { type: 'over' })}
              />
              <OddsCell 
                price={game.markets.total.under.odds} 
                isActive={activeSelections.has(`${game.id}-total-${game.markets.total.under.line}`)}
                onClick={() => handleOddClick(game, 'total', game.markets.total.under.line || 'Under', game.markets.total.under.odds, { type: 'under' })}
              />

              {/* More Odds Chevron */}
              <div className="flex items-center justify-center">
                <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-border/50 text-muted-foreground hover:text-foreground transition-colors" title="More Markets">
                  <ChevronRight size={16} />
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
