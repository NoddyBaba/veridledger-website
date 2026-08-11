"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Link as LinkIcon } from "lucide-react";
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
  markets: {
    ml: { home: { name: string, odds: number }, away: { name: string, odds: number } },
    spread: { home: { name: string, line: string, odds: number }, away: { name: string, line: string, odds: number } },
    total: { over: { line: string, odds: number }, under: { line: string, odds: number } }
  }
};

function parseOddsApiEvent(eventRow: any): Game | null {
  const data = eventRow.odds_data;
  
  // Find a reliable bookmaker, prefer draftkings, then fanduel, then fallback
  const bookmaker = data.bookmakers?.find((b: any) => b.key === 'draftkings') || 
                    data.bookmakers?.find((b: any) => b.key === 'fanduel') || 
                    data.bookmakers?.[0];
                    
  if (!bookmaker) return null; // No odds available for this game

  const h2h = bookmaker.markets.find((m: any) => m.key === 'h2h');
  const spreads = bookmaker.markets.find((m: any) => m.key === 'spreads');
  const totals = bookmaker.markets.find((m: any) => m.key === 'totals');

  const getOutcome = (market: any, nameMatcher: (name: string) => boolean) => {
    return market?.outcomes?.find((o: any) => nameMatcher(o.name)) || { price: 0, point: 0 };
  };

  const homeH2H = getOutcome(h2h, (n) => n === data.home_team);
  const awayH2H = getOutcome(h2h, (n) => n === data.away_team);
  
  const homeSpread = getOutcome(spreads, (n) => n === data.home_team);
  const awaySpread = getOutcome(spreads, (n) => n === data.away_team);
  
  const overTotal = getOutcome(totals, (n) => n.toLowerCase() === 'over');
  const underTotal = getOutcome(totals, (n) => n.toLowerCase() === 'under');

  return {
    id: eventRow.id,
    sport: data.sport_title,
    title: `${data.away_team} @ ${data.home_team}`,
    startTime: data.commence_time,
    markets: {
      ml: {
        away: { name: data.away_team, odds: awayH2H.price },
        home: { name: data.home_team, odds: homeH2H.price }
      },
      spread: {
        away: { name: data.away_team, line: awaySpread.point > 0 ? `+${awaySpread.point}` : `${awaySpread.point}`, odds: awaySpread.price },
        home: { name: data.home_team, line: homeSpread.point > 0 ? `+${homeSpread.point}` : `${homeSpread.point}`, odds: homeSpread.price }
      },
      total: {
        over: { line: `O ${overTotal.point || 0}`, odds: overTotal.price },
        under: { line: `U ${underTotal.point || 0}`, odds: underTotal.price }
      }
    }
  };
}

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

      // Add each parsed selection
      data.selections.forEach((sel: any) => {
        onAddSelection(sel);
      });
      
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

      if (error) {
        console.error("Error fetching live events:", error);
      } else if (data) {
        const parsedGames = data
          .map(parseOddsApiEvent)
          .filter((g): g is Game => g !== null);
        setLiveGames(parsedGames);
      }
      setIsLoading(false);
    };

    fetchLiveEvents();
  }, []);

  const filterByGenericSport = (gameSport: string, filter: string) => {
    if (filter === "All") return true;
    const s = gameSport.toLowerCase();
    if (filter === "Football") return s.includes("nfl") || s.includes("ncaa") || s.includes("football") || s.includes("afl");
    if (filter === "Basketball") return s.includes("nba") || s.includes("basketball") || s.includes("wnba");
    if (filter === "Soccer") return s.includes("soccer") || s.includes("epl") || s.includes("fifa");
    if (filter === "Tennis") return s.includes("tennis") || s.includes("atp") || s.includes("wta");
    if (filter === "Baseball") return s.includes("mlb") || s.includes("baseball") || s.includes("npb") || s.includes("kbo");
    if (filter === "MMA") return s.includes("mma") || s.includes("ufc");
    return false;
  };

  const filteredGames = liveGames.filter(g => 
    filterByGenericSport(g.sport, sportFilter) &&
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleOddClick = (game: Game, type: OddSelection['type'], selectionName: string, odds: number, metadata: any) => {
    if (odds === 0) return; // Prevent clicking missing odds
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

  // Hardcoded cleaner categories instead of raw Odds-API league names
  const availableSports = ["All", "Football", "Basketball", "Soccer", "Baseball", "Tennis", "MMA"];

  return (
    <div className="w-full h-full flex flex-col bg-background/50 border border-border rounded-xl overflow-hidden shadow-xl">
      
      {/* Top Search Bar */}
      <div className="p-4 border-b border-border bg-card flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Search teams, players, or events..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          {availableSports.length > 1 ? availableSports.map(sport => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                sportFilter === sport ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(204,255,0,0.2)]" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {sport}
            </button>
          )) : (
            <span className="text-xs text-muted-foreground">Waiting for live data...</span>
          )}
        </div>
      </div>

      {/* Import Link Bar */}
      <div className="p-4 border-b border-border bg-card/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <LinkIcon size={16} className="text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">Import from Sportsbook</span>
          <span className="bg-primary/20 text-primary text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-primary/30 ml-2">Beta</span>
        </div>
        <div className="flex w-full sm:w-auto flex-1 max-w-xl gap-2 relative">
          <input 
            type="text" 
            placeholder="Paste FanDuel or DraftKings share link..." 
            value={shareLink}
            onChange={(e) => setShareLink(e.target.value)}
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleShareLinkImport}
            disabled={isImporting}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-bold hover:bg-secondary/90 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
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

      {/* Main Odds Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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

        {!isLoading && filteredGames.map(game => (
          <div key={game.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-500">
            <div className="bg-muted/30 px-4 py-3 flex justify-between items-center border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider bg-background px-2 py-1 rounded border border-border/50 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block mr-1.5 animate-pulse"></span>
                  {game.sport}
                </span>
                <span className="font-semibold text-foreground text-sm">{game.title}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {new Date(game.startTime).toLocaleDateString()} {new Date(game.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            
            <div className="p-4 grid grid-cols-3 gap-4 overflow-x-auto">
              
              {/* Spread Column */}
              <div className="space-y-2 min-w-[120px]">
                <div className="text-[10px] uppercase font-bold text-muted-foreground text-center mb-3">Spread</div>
                <button 
                  disabled={game.markets.spread.away.odds === 0}
                  onClick={() => handleOddClick(game, 'spread', `${game.markets.spread.away.name} ${game.markets.spread.away.line}`, game.markets.spread.away.odds, { team: game.markets.spread.away.name, line: parseFloat(game.markets.spread.away.line.replace('+', '')) || 0, homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                  className="w-full bg-background hover:bg-white/[0.04] border border-border rounded-lg p-2.5 flex justify-between items-center transition-colors group disabled:opacity-50"
                >
                  <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate max-w-[70%] text-left">{game.markets.spread.away.line === 'undefined' ? '-' : game.markets.spread.away.line}</span>
                  <span className="text-xs font-mono text-muted-foreground">{game.markets.spread.away.odds > 0 ? `+${game.markets.spread.away.odds}` : game.markets.spread.away.odds}</span>
                </button>
                <button 
                  disabled={game.markets.spread.home.odds === 0}
                  onClick={() => handleOddClick(game, 'spread', `${game.markets.spread.home.name} ${game.markets.spread.home.line}`, game.markets.spread.home.odds, { team: game.markets.spread.home.name, line: parseFloat(game.markets.spread.home.line.replace('+', '')) || 0, homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                  className="w-full bg-background hover:bg-white/[0.04] border border-border rounded-lg p-2.5 flex justify-between items-center transition-colors group disabled:opacity-50"
                >
                  <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate max-w-[70%] text-left">{game.markets.spread.home.line === 'undefined' ? '-' : game.markets.spread.home.line}</span>
                  <span className="text-xs font-mono text-muted-foreground">{game.markets.spread.home.odds > 0 ? `+${game.markets.spread.home.odds}` : game.markets.spread.home.odds}</span>
                </button>
              </div>

              {/* Total Column */}
              <div className="space-y-2 min-w-[120px]">
                <div className="text-[10px] uppercase font-bold text-muted-foreground text-center mb-3">Total</div>
                <button 
                  disabled={game.markets.total.over.odds === 0}
                  onClick={() => handleOddClick(game, 'total', game.markets.total.over.line, game.markets.total.over.odds, { line: parseFloat(game.markets.total.over.line.replace('O ', '')) || 0, type: 'over', homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                  className="w-full bg-background hover:bg-white/[0.04] border border-border rounded-lg p-2.5 flex justify-between items-center transition-colors group disabled:opacity-50"
                >
                  <span className="text-xs text-foreground group-hover:text-primary transition-colors">{game.markets.total.over.line}</span>
                  <span className="text-xs font-mono text-muted-foreground">{game.markets.total.over.odds > 0 ? `+${game.markets.total.over.odds}` : game.markets.total.over.odds}</span>
                </button>
                <button 
                  disabled={game.markets.total.under.odds === 0}
                  onClick={() => handleOddClick(game, 'total', game.markets.total.under.line, game.markets.total.under.odds, { line: parseFloat(game.markets.total.under.line.replace('U ', '')) || 0, type: 'under', homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                  className="w-full bg-background hover:bg-white/[0.04] border border-border rounded-lg p-2.5 flex justify-between items-center transition-colors group disabled:opacity-50"
                >
                  <span className="text-xs text-foreground group-hover:text-primary transition-colors">{game.markets.total.under.line}</span>
                  <span className="text-xs font-mono text-muted-foreground">{game.markets.total.under.odds > 0 ? `+${game.markets.total.under.odds}` : game.markets.total.under.odds}</span>
                </button>
              </div>

              {/* Moneyline Column */}
              <div className="space-y-2 min-w-[120px]">
                <div className="text-[10px] uppercase font-bold text-muted-foreground text-center mb-3">Moneyline</div>
                <button 
                  disabled={game.markets.ml.away.odds === 0}
                  onClick={() => handleOddClick(game, 'ml', `${game.markets.ml.away.name} ML`, game.markets.ml.away.odds, { team: game.markets.ml.away.name, homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                  className="w-full bg-background hover:bg-white/[0.04] border border-border rounded-lg p-2.5 flex justify-between items-center transition-colors group disabled:opacity-50"
                >
                  <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate max-w-[70%] text-left">{game.markets.ml.away.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">{game.markets.ml.away.odds > 0 ? `+${game.markets.ml.away.odds}` : game.markets.ml.away.odds}</span>
                </button>
                <button 
                  disabled={game.markets.ml.home.odds === 0}
                  onClick={() => handleOddClick(game, 'ml', `${game.markets.ml.home.name} ML`, game.markets.ml.home.odds, { team: game.markets.ml.home.name, homeTeam: game.markets.ml.home.name, awayTeam: game.markets.ml.away.name })}
                  className="w-full bg-background hover:bg-white/[0.04] border border-border rounded-lg p-2.5 flex justify-between items-center transition-colors group disabled:opacity-50"
                >
                  <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate max-w-[70%] text-left">{game.markets.ml.home.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">{game.markets.ml.home.odds > 0 ? `+${game.markets.ml.home.odds}` : game.markets.ml.home.odds}</span>
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
