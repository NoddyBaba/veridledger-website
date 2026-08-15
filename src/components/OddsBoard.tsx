"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, X, ChevronRight, ChevronDown } from "lucide-react";
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
  competition: string;
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
    }
  },
  rawOdds: any
};

function normalizeOdds(odds: number | string): number {
  const o = parseFloat(odds as string);
  if (isNaN(o) || o === 0) return 0;
  if (o >= 100) return (o / 100) + 1;
  if (o <= -100) return (100 / Math.abs(o)) + 1;
  return o;
}

function parseApiFootballEvent(eventRow: any): Game | null {
  const data = eventRow.odds_data;
  const bookmaker = data.bookmakers?.[0]; 
  if (!bookmaker || !bookmaker.bets) return null;

  const matchWinner = bookmaker.bets.find((m: any) => m.id === 1 || m.name === "Match Winner");
  const goalsOverUnder = bookmaker.bets.find((m: any) => m.id === 5 || m.name === "Goals Over/Under");

  const getVal = (market: any, valStr: string) => {
    const v = market?.values?.find((v: any) => v.value === valStr);
    return v ? normalizeOdds(v.odd) : 0;
  };

  const over25 = goalsOverUnder?.values?.find((v: any) => v.value === "Over 2.5")?.odd;
  const under25 = goalsOverUnder?.values?.find((v: any) => v.value === "Under 2.5")?.odd;

  return {
    id: eventRow.id,
    sport: 'Football',
    competition: data.league_name || "Football",
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
      }
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
  const totals = bookmaker.markets.find((m: any) => m.key === 'totals');

  const getOutcome = (market: any, nameMatcher: (name: string) => boolean) => {
    return market?.outcomes?.find((o: any) => nameMatcher(o.name)) || { price: 0, point: 0 };
  };

  const homeH2H = getOutcome(h2h, (n: string) => n === data.home_team);
  const awayH2H = getOutcome(h2h, (n: string) => n === data.away_team);
  const drawH2H = getOutcome(h2h, (n: string) => n === 'Draw');
  
  const overTotal = getOutcome(totals, (n: string) => n.toLowerCase() === 'over');
  const underTotal = getOutcome(totals, (n: string) => n.toLowerCase() === 'under');

  const isSoccer = data.sport_key.toLowerCase().includes('soccer');
  let sportName = data.sport_title;
  let competition = data.sport_title;
  
  if (data.sport_key.toLowerCase().includes('americanfootball') || data.sport_key.toLowerCase().includes('nfl') || data.sport_key.toLowerCase().includes('ncaa')) {
    sportName = "American Football";
  }

  return {
    id: eventRow.id,
    sport: sportName,
    competition: competition,
    title: `${data.home_team} vs ${data.away_team}`,
    startTime: data.commence_time,
    isSoccer,
    rawOdds: data,
    markets: {
      ml: {
        home: { name: data.home_team, odds: normalizeOdds(homeH2H.price) },
        away: { name: data.away_team, odds: normalizeOdds(awayH2H.price) },
        ...(isSoccer ? { draw: { name: 'Draw', odds: normalizeOdds(drawH2H.price) } } : {})
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
  const [activeSelections, setActiveSelections] = useState<Set<string>>(new Set());
  
  // Modal State
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

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
      else if (s.includes("afl") || s.includes("aussie")) categories.add("Aussie Rules");
      else if (s.includes("cricket") || s.includes("test match") || s.includes("t20") || s.includes("odi")) categories.add("Cricket");
      else if (s.includes("rugby")) categories.add("Rugby");
      else if (s.includes("ice hockey") || s.includes("nhl")) categories.add("Ice Hockey");
      else categories.add(g.sport); 
    });
    
    return Array.from(categories).sort();
  };

  const filterByGenericSport = (gameSport: string, filter: string) => {
    if (filter === "All") return true;
    const s = gameSport.toLowerCase();
    
    if (filter === "American Football") return s.includes("american football") || s.includes("nfl") || s.includes("ncaa");
    if (filter === "Basketball") return s.includes("nba") || s.includes("basketball") || s.includes("wnba");
    if (filter === "Football") return (s.includes("football") && !s.includes("american")) || s.includes("soccer") || s.includes("epl") || s.includes("fifa");
    if (filter === "Tennis") return s.includes("tennis") || s.includes("atp") || s.includes("wta");
    if (filter === "Baseball") return s.includes("mlb") || s.includes("baseball") || s.includes("npb") || s.includes("kbo");
    if (filter === "MMA") return s.includes("mma") || s.includes("ufc");
    if (filter === "Aussie Rules") return s.includes("afl") || s.includes("aussie");
    if (filter === "Cricket") return s.includes("cricket") || s.includes("test match") || s.includes("t20") || s.includes("odi");
    if (filter === "Rugby") return s.includes("rugby");
    if (filter === "Ice Hockey") return s.includes("ice hockey") || s.includes("nhl");
    
    return gameSport === filter; 
  };

  const filteredGames = liveGames.filter(g => 
    filterByGenericSport(g.sport, sportFilter) &&
    (g.title.toLowerCase().includes(search.toLowerCase()) || 
     g.sport.toLowerCase().includes(search.toLowerCase()) || 
     g.competition.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOddClick = (game: Game, type: OddSelection['type'], selectionName: string, odds: number, metadata: any) => {
    if (odds === 0) return;
    
    const uniqueId = `${game.id}-${type}-${selectionName.replace(/\s+/g, '')}`;
    
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

  const allAvailableSports = getDynamicSports();
  const coreSportsOrder = ["Football", "Basketball", "Tennis", "American Football", "Ice Hockey", "Baseball"];
  const availableCoreSports = coreSportsOrder.filter(s => allAvailableSports.includes(s));
  const otherSports = allAvailableSports.filter(s => !coreSportsOrder.includes(s));
  
  const isOtherSportSelected = otherSports.includes(sportFilter);

  return (
    <div className="w-full h-full flex flex-col bg-background/50 border border-border rounded-xl overflow-hidden shadow-xl relative">
      
      {/* Top Search & Tabs */}
      <div className="p-4 border-b border-border bg-card flex flex-col xl:flex-row gap-3 xl:items-center">
        <div className="relative w-full xl:max-w-[280px] flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text" 
            placeholder="Search matches or leagues..." 
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
        
        <div className="flex gap-1.5 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 bg-muted/30 p-1 rounded-full border border-border [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setSportFilter("All")}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
              sportFilter === "All" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {availableCoreSports.map(sport => (
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
          
          {/* More Sports Dropdown / Selector */}
          {otherSports.length > 0 && (
            <div className="relative flex items-center shrink-0">
              <select 
                value={isOtherSportSelected ? sportFilter : ""}
                onChange={(e) => { setSportFilter(e.target.value); (document.activeElement as HTMLElement)?.blur(); }}
                className={`appearance-none outline-none flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors cursor-pointer pr-8 ${
                  isOtherSportSelected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground bg-muted/50"
                }`}
              >
                <option value="" disabled hidden>More</option>
                {otherSports.map(sport => (
                  <option key={sport} value={sport} className="text-foreground bg-card">{sport}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
            </div>
          )}
        </div>
      </div>

      {/* Main Odds Area */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-muted-foreground text-sm font-medium">Fetching Live Oracle Data...</p>
          </div>
        )}

        {!isLoading && filteredGames.length === 0 && (
          <div className="text-center p-12 m-4 border border-dashed border-border rounded-xl bg-card">
            <p className="text-muted-foreground font-medium">No live markets available.</p>
          </div>
        )}

        {!isLoading && filteredGames.length > 0 && (
          <div className="sticky top-0 z-10 grid grid-cols-[1fr_repeat(5,minmax(60px,70px))_30px] sm:grid-cols-[2fr_repeat(5,minmax(60px,80px))_40px] gap-1.5 items-center px-4 py-2 border-b border-border bg-card/95 backdrop-blur text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <div>Match</div>
            <div className="text-center">1</div>
            <div className="text-center">X</div>
            <div className="text-center">2</div>
            <div className="text-center">O 2.5</div>
            <div className="text-center">U 2.5</div>
            <div></div>
          </div>
        )}

        {!isLoading && filteredGames.map(game => {
          const isLive = new Date(game.startTime).getTime() < Date.now();
          const d = new Date(game.startTime);
          const timeStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
          const disableDraw = !game.isSoccer && !game.markets.ml.draw;

          return (
            <div key={game.id} className="grid grid-cols-[1fr_repeat(5,minmax(60px,70px))_30px] sm:grid-cols-[2fr_repeat(5,minmax(60px,80px))_40px] gap-1.5 items-center px-4 py-3 border-b border-border hover:bg-muted/10 transition-colors group">
              <div 
                className="flex flex-col min-w-0 pr-2 cursor-pointer hover:opacity-80"
                onClick={() => setSelectedGame(game)}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  {isLive ? (
                    <span className="flex items-center gap-1 text-[9px] font-extrabold tracking-widest text-red-500 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">{timeStr}</span>
                  )}
                  {/* Clean Competition Badge */}
                  <span className="text-[9px] text-primary/90 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded uppercase truncate max-w-[150px] font-semibold">{game.competition}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold truncate text-foreground/90">{game.markets.ml.home.name}</span>
                  <span className="text-[13px] font-semibold truncate text-foreground/90">{game.markets.ml.away.name}</span>
                </div>
              </div>

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

              <div className="flex items-center justify-center">
                <button 
                  onClick={() => setSelectedGame(game)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-border/50 text-muted-foreground hover:text-foreground transition-colors" 
                  title="More Markets"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Match Details Slide-out Modal */}
      {selectedGame && (
        <div className="absolute inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md h-full bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right-8 duration-300">
            
            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b border-border bg-muted/20">
              <div>
                <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">{selectedGame.competition}</p>
                <h3 className="text-lg font-bold leading-tight">{selectedGame.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedGame(null)}
                className="p-2 rounded-full hover:bg-border/50 text-muted-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Markets */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              {selectedGame.isSoccer ? (
                // API-FOOTBALL DEEP MARKETS
                (() => {
                  const bookmaker = selectedGame.rawOdds.bookmakers?.[0];
                  if (!bookmaker || !bookmaker.bets) return <p className="text-muted-foreground text-sm">No markets available.</p>;

                  return bookmaker.bets.map((market: any, idx: number) => {
                    // Only show interesting markets
                    const hideMarkets = [1, 5]; // Hide 1X2 and main Over/Under as they are already on main screen
                    if (hideMarkets.includes(market.id)) return null;

                    return (
                      <div key={idx} className="bg-muted/10 border border-border rounded-lg overflow-hidden">
                        <div className="bg-muted/30 px-3 py-2 border-b border-border text-sm font-semibold text-foreground/90">
                          {market.name}
                        </div>
                        <div className="grid grid-cols-2 gap-[1px] bg-border p-[1px]">
                          {market.values.map((v: any, vIdx: number) => {
                            const oddsVal = normalizeOdds(v.odd);
                            const uId = `${selectedGame.id}-prop-${market.name}-${v.value}`;
                            return (
                              <button
                                key={vIdx}
                                onClick={() => handleOddClick(selectedGame, 'prop', `${market.name}: ${v.value}`, oddsVal, {})}
                                className={`flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                                  activeSelections.has(uId) ? 'bg-primary text-primary-foreground font-bold' : 'bg-card hover:bg-muted/50'
                                }`}
                              >
                                <span className={activeSelections.has(uId) ? "text-primary-foreground" : "text-muted-foreground"}>{v.value}</span>
                                <span className="font-mono font-bold">{oddsVal.toFixed(2)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                // THE-ODDS-API MARKETS (Non-Soccer)
                (() => {
                  const bookmaker = selectedGame.rawOdds.bookmakers?.find((b: any) => b.key === 'draftkings') || selectedGame.rawOdds.bookmakers?.[0];
                  if (!bookmaker) return <p className="text-muted-foreground text-sm">No markets available.</p>;

                  return bookmaker.markets.map((market: any, idx: number) => {
                    return (
                      <div key={idx} className="bg-muted/10 border border-border rounded-lg overflow-hidden">
                        <div className="bg-muted/30 px-3 py-2 border-b border-border text-sm font-semibold text-foreground/90 capitalize">
                          {market.key.replace('_', ' ')}
                        </div>
                        <div className="grid grid-cols-2 gap-[1px] bg-border p-[1px]">
                          {market.outcomes.map((o: any, oIdx: number) => {
                            const oddsVal = normalizeOdds(o.price);
                            const uId = `${selectedGame.id}-prop-${market.key}-${o.name}`;
                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleOddClick(selectedGame, 'prop', `${market.key}: ${o.name} ${o.point ? o.point : ''}`, oddsVal, {})}
                                className={`flex flex-col items-center justify-center px-2 py-3 text-sm transition-colors ${
                                  activeSelections.has(uId) ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/50'
                                }`}
                              >
                                <span className={`text-xs mb-1 ${activeSelections.has(uId) ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{o.name} {o.point ? (o.point > 0 ? `+${o.point}` : o.point) : ''}</span>
                                <span className="font-mono font-bold">{oddsVal.toFixed(2)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
