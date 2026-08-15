"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Link as LinkIcon, X } from "lucide-react";
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
    spread: { 
      home: { name: string, line: string, odds: number }, 
      away: { name: string, line: string, odds: number } 
    },
    total: { 
      over: { line: string, odds: number }, 
      under: { line: string, odds: number } 
    }
  }
};

function parseOddsApiEvent(eventRow: any): Game | null {
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

  return {
    id: eventRow.id,
    sport: isSoccer ? 'Football' : (data.sport_key.toLowerCase().includes('americanfootball') || data.sport_key.toLowerCase().includes('nfl') ? 'American Football' : data.sport_title),
    title: `${data.away_team} @ ${data.home_team}`,
    startTime: data.commence_time,
    isSoccer,
    markets: {
      ml: {
        away: { name: data.away_team, odds: awayH2H.price },
        home: { name: data.home_team, odds: homeH2H.price },
        ...(isSoccer ? { draw: { name: 'Draw', odds: drawH2H.price } } : {})
      },
      spread: {
        away: { name: data.away_team, line: awaySpread.point !== undefined && awaySpread.point > 0 ? `+${awaySpread.point}` : `${awaySpread.point || ''}`, odds: awaySpread.price },
        home: { name: data.home_team, line: homeSpread.point !== undefined && homeSpread.point > 0 ? `+${homeSpread.point}` : `${homeSpread.point || ''}`, odds: homeSpread.price }
      },
      total: {
        over: { line: overTotal.point ? `O ${overTotal.point}` : '', odds: overTotal.price },
        under: { line: underTotal.point ? `U ${underTotal.point}` : '', odds: underTotal.price }
      }
    }
  };
}

const OddsCell = ({ line, price, onClick, disabled }: { line?: string, price: number, onClick: () => void, disabled?: boolean }) => {
  if (price === 0 || disabled) {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 h-12 rounded-md border border-dashed border-border bg-transparent">
        <span className="text-xs font-semibold text-muted-foreground">—</span>
      </div>
    );
  }
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 h-12 rounded-md border border-border bg-muted/20 hover:border-muted-foreground/40 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary transition-colors cursor-pointer group"
    >
      {line && line !== 'undefined' && line !== '' && <span className="text-[13px] font-bold font-mono group-hover:text-primary transition-colors">{line}</span>}
      <span className="text-[11px] text-muted-foreground font-mono">{price.toFixed(2)}</span>
    </button>
  );
};

export default function OddsBoard({ onAddSelection }: { onAddSelection: (selection: OddSelection) => void }) {
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("All");
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareLink, setShareLink] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleShareLinkImport = async () => {
    if (!shareLink) return;
    setIsImporting(true);
    setImportError("");
    
    try {
      const res = await fetch('/api/parse-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: shareLink })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      data.selections.forEach((sel: any) => onAddSelection(sel));
      setShareLink("");
    } catch (err: any) {
      setImportError(err.message || "Failed to parse slip.");
      setTimeout(() => setImportError(""), 5000);
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    const fetchLiveEvents = async () => {
      setIsLoading(true);
      const { data, error } = await supabase!
        .from('live_events')
        .select('*')
        .order('commence_time', { ascending: true });

      if (!error && data) {
        const parsedGames = data.map(parseOddsApiEvent).filter((g): g is Game => g !== null);
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
      else if (s.includes("icehockey") || s.includes("nhl")) categories.add("Ice Hockey");
      else if (s.includes("cricket")) categories.add("Cricket");
      else if (s.includes("rugby")) categories.add("Rugby");
      else if (s.includes("aussierules")) categories.add("Aussie Rules");
      else categories.add("Other"); 
    });
    return ["All", ...Array.from(categories).sort()];
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
    if (filter === "Ice Hockey") return s.includes("icehockey") || s.includes("nhl");
    if (filter === "Cricket") return s.includes("cricket");
    if (filter === "Rugby") return s.includes("rugby");
    if (filter === "Aussie Rules") return s.includes("aussierules");
    if (filter === "Other") return true; 
    
    return true; 
  };

  const filteredGames = liveGames.filter(g => 
    filterByGenericSport(g.sport, sportFilter) &&
    (g.title.toLowerCase().includes(search.toLowerCase()) || g.sport.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOddClick = (game: Game, type: OddSelection['type'], selectionName: string, odds: number, metadata: any) => {
    if (odds === 0) return;
    onAddSelection({
      id: `${game.id}-${type}-${selectionName.replace(/\s+/g, '')}`,
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
      
      {/* Top Search & Tabs (New sleek layout) */}
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

      {/* Import Link Bar */}
      <div className="p-3.5 border-b border-border bg-card/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <LinkIcon size={16} className="text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Import from Sportsbook</span>
              <span className="bg-primary text-primary-foreground text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-full">Beta</span>
            </div>
          </div>
        </div>
        <div className="flex w-full sm:w-auto flex-1 max-w-md gap-2 relative">
          <input 
            type="text" 
            placeholder="Paste FanDuel or DraftKings share link..." 
            value={shareLink}
            onChange={(e) => setShareLink(e.target.value)}
            className="flex-1 bg-muted/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleShareLinkImport}
            disabled={isImporting}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-bold hover:brightness-110 transition-all shadow-sm whitespace-nowrap disabled:opacity-50"
          >
            {isImporting ? "Parsing..." : "Import Slip"}
          </button>
          {importError && (
            <div className="absolute top-12 left-0 right-0 bg-red-500/90 text-white text-xs font-medium p-2 rounded-lg shadow-lg z-10 text-center animate-in fade-in slide-in-from-top-2">
              {importError}
            </div>
          )}
        </div>
      </div>

      {/* Grid Headers */}
      <div className="grid grid-cols-[minmax(120px,1.4fr)_repeat(3,minmax(80px,1fr))] sm:grid-cols-[minmax(150px,1.6fr)_repeat(3,minmax(80px,1fr))] gap-2 items-center px-4 sm:px-6 py-2 border-b border-border bg-card/30">
        <span className="text-[10.5px] font-bold tracking-[0.07em] text-muted-foreground uppercase text-left"></span>
        <span className="text-[10.5px] font-bold tracking-[0.07em] text-muted-foreground uppercase text-center">Handicap</span>
        <span className="text-[10.5px] font-bold tracking-[0.07em] text-muted-foreground uppercase text-center">Over / Under</span>
        <span className="text-[10.5px] font-bold tracking-[0.07em] text-muted-foreground uppercase text-center">Winner (1X2)</span>
      </div>

      {/* Main Odds Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-muted-foreground text-sm font-medium">Fetching Live Oracle Data...</p>
          </div>
        )}

        {!isLoading && filteredGames.length === 0 && (
          <div className="text-center p-12 border border-dashed border-border rounded-xl bg-card">
            <p className="text-muted-foreground font-medium">No live markets available.</p>
            <p className="text-xs text-muted-foreground mt-2">Trigger the backend sync endpoint to populate the database.</p>
          </div>
        )}

        {!isLoading && filteredGames.map(game => {
          const isLive = new Date(game.startTime).getTime() < Date.now();
          
          return (
            <div key={game.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-500">
              
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-card/50">
                <span className="text-[10.5px] font-bold tracking-[0.04em] text-muted-foreground bg-white/5 border border-border px-2 py-1 rounded-md uppercase whitespace-nowrap">
                  {game.sport}
                </span>
                {isLive && (
                  <span className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest text-red-500 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_0_0_rgba(239,68,68,0.6)] animate-pulse"></span>
                    LIVE
                  </span>
                )}
                <span className="text-sm font-bold flex-1 truncate">{game.title}</span>
                {!isLive && (
                  <span className="font-mono text-[11.5px] text-muted-foreground text-right whitespace-nowrap hidden sm:inline-block">
                    {new Date(game.startTime).toLocaleDateString()} · {new Date(game.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-[minmax(120px,1.4fr)_repeat(3,minmax(80px,1fr))] sm:grid-cols-[minmax(150px,1.6fr)_repeat(3,minmax(80px,1fr))] gap-2 items-center px-4 py-2 border-b border-border">
                <span className="text-[13.5px] font-semibold truncate pr-2">{game.markets.ml.away.name} <span className="text-muted-foreground text-xs font-normal hidden sm:inline-block">(Away)</span></span>
                <OddsCell 
                  line={game.markets.spread.away.line} 
                  price={game.markets.spread.away.odds}
                  onClick={() => handleOddClick(game, 'spread', `${game.markets.spread.away.name} ${game.markets.spread.away.line}`, game.markets.spread.away.odds, { team: game.markets.spread.away.name, line: parseFloat(game.markets.spread.away.line.replace('+', '')) || 0, homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                />
                {/* Note: Over is usually top row, Under is bottom row. Changing this! */}
                <OddsCell 
                  line={game.markets.total.over.line} 
                  price={game.markets.total.over.odds}
                  onClick={() => handleOddClick(game, 'total', game.markets.total.over.line, game.markets.total.over.odds, { line: parseFloat(game.markets.total.over.line.replace('O ', '')) || 0, type: 'over', homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                />
                <OddsCell 
                  price={game.markets.ml.away.odds}
                  onClick={() => handleOddClick(game, 'ml', `${game.markets.ml.away.name} Winner`, game.markets.ml.away.odds, { team: game.markets.ml.away.name, homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                />
              </div>

              <div className={`grid grid-cols-[minmax(120px,1.4fr)_repeat(3,minmax(80px,1fr))] sm:grid-cols-[minmax(150px,1.6fr)_repeat(3,minmax(80px,1fr))] gap-2 items-center px-4 py-2 ${game.isSoccer ? 'border-b border-border' : ''}`}>
                <span className="text-[13.5px] font-semibold truncate pr-2">{game.markets.ml.home.name} <span className="text-muted-foreground text-xs font-normal hidden sm:inline-block">(Home)</span></span>
                <OddsCell 
                  line={game.markets.spread.home.line} 
                  price={game.markets.spread.home.odds}
                  onClick={() => handleOddClick(game, 'spread', `${game.markets.spread.home.name} ${game.markets.spread.home.line}`, game.markets.spread.home.odds, { team: game.markets.spread.home.name, line: parseFloat(game.markets.spread.home.line.replace('+', '')) || 0, homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                />
                {/* Under is bottom row */}
                <OddsCell 
                  line={game.markets.total.under.line} 
                  price={game.markets.total.under.odds}
                  onClick={() => handleOddClick(game, 'total', game.markets.total.under.line, game.markets.total.under.odds, { line: parseFloat(game.markets.total.under.line.replace('U ', '')) || 0, type: 'under', homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                />
                <OddsCell 
                  price={game.markets.ml.home.odds}
                  onClick={() => handleOddClick(game, 'ml', `${game.markets.ml.home.name} Winner`, game.markets.ml.home.odds, { team: game.markets.ml.home.name, homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                />
              </div>
              
              {game.isSoccer && (
                <div className="grid grid-cols-[minmax(120px,1.4fr)_repeat(3,minmax(80px,1fr))] sm:grid-cols-[minmax(150px,1.6fr)_repeat(3,minmax(80px,1fr))] gap-2 items-center px-4 py-2 bg-muted/10">
                  <span className="text-[13.5px] font-semibold truncate pr-2 text-muted-foreground">Draw <span className="text-xs font-normal hidden sm:inline-block">(X)</span></span>
                  <OddsCell price={0} onClick={() => {}} disabled={true} />
                  <OddsCell price={0} onClick={() => {}} disabled={true} />
                  <OddsCell 
                    price={game.markets.ml.draw?.odds || 0}
                    onClick={() => handleOddClick(game, 'ml', 'Draw', game.markets.ml.draw?.odds || 0, { team: 'Draw', homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
