"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, X, ChevronRight, ChevronDown, TrendingUp, TrendingDown, ShieldCheck } from "lucide-react";
import CryptoEngineLoader from "@/components/CryptoEngineLoader";
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

type ChipData = {
  id: string;
  label: string;
  value: number;
  movement?: "up" | "down";
  meta: any;
};

type ClusterData = {
  id: string;
  title: string;
  chips: ChipData[];
};

type Game = {
  id: string;
  sport: string;
  competition: string;
  title: string;
  startTime: string;
  status: { live: boolean; minute?: string; time?: string };
  home: { name: string; short: string; color: string };
  away: { name: string; short: string; color: string };
  score?: { home: number; away: number };
  markets: { clusters: ClusterData[] };
  rawOdds: any; oddsApiSportKey?: string;
};

function normalizeOdds(odds: number | string): number {
  const o = parseFloat(odds as string);
  if (isNaN(o) || o === 0) return 0;
  if (o >= 100) return (o / 100) + 1;
  if (o <= -100) return (100 / Math.abs(o)) + 1;
  return o;
}

const getShort = (name: string) => name.substring(0, 3).toUpperCase();
const getColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};

function formatStartTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
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

  const homeOdds = getVal(matchWinner, "Home");
  const drawOdds = getVal(matchWinner, "Draw");
  const awayOdds = getVal(matchWinner, "Away");
  const o25Odds = over25 ? normalizeOdds(over25) : 0;
  const u25Odds = under25 ? normalizeOdds(under25) : 0;

  const isLive = new Date(eventRow.commence_time).getTime() < Date.now();

  return {
    id: eventRow.id,
    sport: 'Football',
    competition: data.league_name || "Football",
    title: `${eventRow.home_team} vs ${eventRow.away_team}`,
    startTime: eventRow.commence_time,
    status: isLive ? { live: true, minute: "LIVE" } : { live: false, time: formatStartTime(eventRow.commence_time) },
    home: { name: eventRow.home_team, short: getShort(eventRow.home_team), color: getColor(eventRow.home_team) },
    away: { name: eventRow.away_team, short: getShort(eventRow.away_team), color: getColor(eventRow.away_team) },
    rawOdds: data, oddsApiSportKey: data.sport_key,
    markets: {
      clusters: [
        {
          id: "1x2",
          title: "1X2",
          chips: [
            { id: `${eventRow.id}-ml-${eventRow.home_team}Winner`, label: "1", value: homeOdds, meta: { type: 'ml', selectionName: `${eventRow.home_team} Winner`, team: eventRow.home_team } },
            { id: `${eventRow.id}-ml-Draw`, label: "X", value: drawOdds, meta: { type: 'ml', selectionName: `Draw`, team: "Draw" } },
            { id: `${eventRow.id}-ml-${eventRow.away_team}Winner`, label: "2", value: awayOdds, meta: { type: 'ml', selectionName: `${eventRow.away_team} Winner`, team: eventRow.away_team } },
          ]
        },
        {
          id: "ou",
          title: "O/U",
          chips: [
            { id: `${eventRow.id}-total-O2.5`, label: "O 2.5", value: o25Odds, meta: { type: 'total', selectionName: 'Over 2.5', line: 2.5 } },
            { id: `${eventRow.id}-total-U2.5`, label: "U 2.5", value: u25Odds, meta: { type: 'total', selectionName: 'Under 2.5', line: 2.5 } },
          ]
        }
      ]
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
  } else if (data.sport_key.toLowerCase().includes('basketball') || data.sport_key.toLowerCase().includes('nba')) {
    sportName = "Basketball";
  } else if (data.sport_key.toLowerCase().includes('tennis') || data.sport_key.toLowerCase().includes('atp') || data.sport_key.toLowerCase().includes('wta')) {
    sportName = "Tennis";
  } else if (data.sport_key.toLowerCase().includes('baseball') || data.sport_key.toLowerCase().includes('mlb')) {
    sportName = "Baseball";
  } else if (data.sport_key.toLowerCase().includes('mma') || data.sport_key.toLowerCase().includes('ufc')) {
    sportName = "MMA";
  } else if (data.sport_key.toLowerCase().includes('afl') || data.sport_key.toLowerCase().includes('aussie')) {
    sportName = "Aussie Rules";
  } else if (data.sport_key.toLowerCase().includes('cricket') || data.sport_key.toLowerCase().includes('t20')) {
    sportName = "Cricket";
  } else if (data.sport_key.toLowerCase().includes('hockey') || data.sport_key.toLowerCase().includes('nhl')) {
    sportName = "Ice Hockey";
  } else if (data.sport_key.toLowerCase().includes('boxing')) {
    sportName = "Boxing";
  }

  const isLive = new Date(data.commence_time).getTime() < Date.now();
  
  let clusters: ClusterData[] = [];
  
  if (isSoccer) {
    clusters = [
      {
        id: "1x2",
        title: "1X2",
        chips: [
          { id: `${eventRow.id}-ml-${data.home_team}Winner`, label: "1", value: normalizeOdds(homeH2H.price), meta: { type: 'ml', selectionName: `${data.home_team} Winner`, team: data.home_team } },
          { id: `${eventRow.id}-ml-Draw`, label: "X", value: normalizeOdds(drawH2H.price), meta: { type: 'ml', selectionName: `Draw`, team: "Draw" } },
          { id: `${eventRow.id}-ml-${data.away_team}Winner`, label: "2", value: normalizeOdds(awayH2H.price), meta: { type: 'ml', selectionName: `${data.away_team} Winner`, team: data.away_team } },
        ]
      },
      {
        id: "ou",
        title: "O/U",
        chips: [
          { id: `${eventRow.id}-total-O${overTotal.point||2.5}`, label: `O ${overTotal.point||2.5}`, value: normalizeOdds(overTotal.price), meta: { type: 'total', selectionName: `Over ${overTotal.point||2.5}`, line: overTotal.point || 2.5 } },
          { id: `${eventRow.id}-total-U${underTotal.point||2.5}`, label: `U ${underTotal.point||2.5}`, value: normalizeOdds(underTotal.price), meta: { type: 'total', selectionName: `Under ${underTotal.point||2.5}`, line: underTotal.point || 2.5 } },
        ]
      }
    ];
  } else {
    clusters = [
      {
        id: "ou",
        title: "O/U",
        chips: [
          { id: `${eventRow.id}-total-O${overTotal.point}`, label: `O ${overTotal.point||''}`, value: normalizeOdds(overTotal.price), meta: { type: 'total', selectionName: `Over ${overTotal.point}`, line: overTotal.point } },
          { id: `${eventRow.id}-total-U${underTotal.point}`, label: `U ${underTotal.point||''}`, value: normalizeOdds(underTotal.price), meta: { type: 'total', selectionName: `Under ${underTotal.point}`, line: underTotal.point } },
        ]
      },
      {
        id: "winner",
        title: "WINNER",
        chips: [
          { id: `${eventRow.id}-ml-${data.home_team}Winner`, label: "1", value: normalizeOdds(homeH2H.price), meta: { type: 'ml', selectionName: `${data.home_team} Winner`, team: data.home_team } },
          { id: `${eventRow.id}-ml-${data.away_team}Winner`, label: "2", value: normalizeOdds(awayH2H.price), meta: { type: 'ml', selectionName: `${data.away_team} Winner`, team: data.away_team } },
        ]
      }
    ];
  }

  return {
    id: eventRow.id,
    sport: sportName,
    competition: competition,
    title: `${data.home_team} vs ${data.away_team}`,
    startTime: data.commence_time,
    status: isLive ? { live: true, minute: "LIVE" } : { live: false, time: formatStartTime(data.commence_time) },
    home: { name: data.home_team, short: getShort(data.home_team), color: getColor(data.home_team) },
    away: { name: data.away_team, short: getShort(data.away_team), color: getColor(data.away_team) },
    rawOdds: data,
    markets: { clusters }
  };
}

const clusterWidth = (chipCount: number) => (chipCount >= 3 ? 216 : 150);

function OddChip({ chip, matchLabel, selected, onToggle }: { chip: ChipData, matchLabel: string, selected: boolean, onToggle: (chip: ChipData) => void }) {
  if (!chip.value || chip.value === 0) {
    return (
      <div 
        className="relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 border"
        style={{ minWidth: 66, backgroundColor: "var(--surface-2)", borderColor: "var(--border)", opacity: 0.5 }}
      >
        <span className="text-3xs font-mono uppercase tracking-wider text-ink-faint">{chip.label}</span>
        <span className="text-sm font-mono font-semibold text-ink-dim">—</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${matchLabel} — ${chip.label} at ${chip.value.toFixed(2)}`}
      onClick={() => onToggle(chip)}
      className="relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 border transition-all duration-150 active:scale-95 group"
      style={{
        minWidth: 66,
        backgroundColor: selected ? "var(--lime)" : "var(--surface-2)",
        borderColor: selected ? "var(--lime)" : "var(--border)",
        boxShadow: selected
          ? "0 0 0 1px rgba(204,255,0,0.35), 0 6px 18px -6px rgba(204,255,0,0.55)"
          : "none",
      }}
    >
      <span
        className="pointer-events-none absolute transition-all duration-200"
        style={{
          inset: -4,
          opacity: selected ? 1 : 0,
          transform: selected ? "scale(1)" : "scale(0.85)",
        }}
      >
        <span className="absolute top-0 left-0 h-2 w-2 border-t border-l" style={{ borderColor: "var(--obsidian)" }} />
        <span className="absolute top-0 right-0 h-2 w-2 border-t border-r" style={{ borderColor: "var(--obsidian)" }} />
        <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l" style={{ borderColor: "var(--obsidian)" }} />
        <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r" style={{ borderColor: "var(--obsidian)" }} />
      </span>

      <span
        className="text-3xs font-mono uppercase tracking-wider transition-colors"
        style={{ color: selected ? "rgba(10,10,13,0.65)" : "var(--ink-faint)" }}
      >
        {chip.label}
      </span>
      <span
        className="text-sm font-mono font-semibold flex items-center gap-0.5 transition-colors group-hover:text-lime"
        style={{ color: selected ? "var(--obsidian)" : "var(--ink)" }}
      >
        {chip.value.toFixed(2)}
        {chip.movement === "up" && <TrendingUp className="h-3 w-3 text-emerald-400" strokeWidth={2.5} />}
        {chip.movement === "down" && <TrendingDown className="h-3 w-3" style={{ color: "var(--live)" }} strokeWidth={2.5} />}
      </span>
    </button>
  );
}

function ChipCluster({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-3xs font-mono uppercase tracking-widest text-ink-faint">{title}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Game['status'] }) {
  if (status.live) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="live-ping absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: "var(--live)" }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "var(--live)" }} />
        </span>
        <span className="text-2xs font-mono font-semibold text-live">{status.minute}</span>
      </div>
    );
  }
  return <span className="text-xs font-mono text-ink-dim whitespace-nowrap font-medium">{status.time}</span>;
}

function TeamLine({ team, score, live }: { team: Game['home'], score?: number, live: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="flex-none h-5 w-5 rounded-full flex items-center justify-center text-3xs font-mono font-bold"
          style={{ backgroundColor: team.color + "22", color: team.color, border: `1px solid ${team.color}66` }}
        >
          {team.short[0]}
        </span>
        <span className="text-sm font-medium text-ink truncate">{team.name}</span>
      </div>
      {live && score !== undefined && <span className="text-sm font-mono font-semibold text-ink flex-none">{score}</span>}
    </div>
  );
}

function MatchRow({ match, selections, onToggle }: { match: Game, selections: Set<string>, onToggle: (match: Game, chip: ChipData) => void }) {
  const matchLabel = match.title;

  return (
    <>
      <div
        className="hidden lg:flex items-center gap-5 px-4 py-3 border-b transition-colors"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
      >
        <div style={{ width: 76 }} className="flex-none">
          <StatusBadge status={match.status} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <TeamLine team={match.home} score={match.score?.home} live={match.status.live} />
          <TeamLine team={match.away} score={match.score?.away} live={match.status.live} />
        </div>

        <div className="flex-none flex items-center gap-6">
          {match.markets.clusters.map((cluster) => (
            <div key={cluster.id} style={{ width: clusterWidth(cluster.chips.length) }} className="flex items-center justify-center gap-1.5">
              {cluster.chips.map((chip) => (
                <OddChip key={chip.id} chip={chip} matchLabel={matchLabel} selected={selections.has(chip.id)} onToggle={(c) => onToggle(match, c)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="lg:hidden flex flex-col gap-3 p-3 border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <StatusBadge status={match.status} />
        </div>

        <div className="flex flex-col gap-1.5">
          <TeamLine team={match.home} score={match.score?.home} live={match.status.live} />
          <TeamLine team={match.away} score={match.score?.away} live={match.status.live} />
        </div>

        <div className="flex items-start justify-between gap-2 pt-1 overflow-x-auto scrollbar-none">
          {match.markets.clusters.map((cluster) => (
            <ChipCluster key={cluster.id} title={cluster.title}>
              {cluster.chips.map((chip) => (
                <OddChip key={chip.id} chip={chip} matchLabel={matchLabel} selected={selections.has(chip.id)} onToggle={(c) => onToggle(match, c)} />
              ))}
            </ChipCluster>
          ))}
        </div>
      </div>
    </>
  );
}

function LeagueGroup({ name, games, collapsed, onToggleCollapse, selections, onToggle }: { name: string, games: Game[], collapsed: boolean, onToggleCollapse: () => void, selections: Set<string>, onToggle: (match: Game, chip: ChipData) => void }) {
  const sample = games[0];
  const clusterTitles = sample ? sample.markets.clusters.map((c) => ({ title: c.title, width: clusterWidth(c.chips.length) })) : [];

  return (
    <div className="mb-4 rounded-xl overflow-hidden border shadow-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--obsidian)" }}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-white/5 transition-colors"
        style={{ backgroundColor: "var(--surface-2)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-sm font-semibold text-ink truncate">{name}</span>
          <span className="text-3xs font-mono text-ink-faint surface-2 rounded-full px-1.5 py-0.5 flex-none" style={{ backgroundColor: "var(--surface)" }}>
            {games.length}
          </span>
        </div>

        <div className="flex items-center gap-6 flex-none">
          <div className="hidden lg:flex items-center gap-6">
            {clusterTitles.map((c, i) => (
              <span key={i} style={{ width: c.width }} className="text-3xs font-mono uppercase tracking-widest text-ink-faint text-center">
                {c.title}
              </span>
            ))}
          </div>
          <ChevronDown
            className="h-4 w-4 text-ink-faint transition-transform duration-200"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
          />
        </div>
      </button>

      {!collapsed && (
        <div className="flex flex-col">
          {games.map((m) => (
            <MatchRow key={m.id} match={m} selections={selections} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OddsBoard({ onAddSelection }: { onAddSelection: (selection: OddSelection) => void }) {
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSport, setActiveSport] = useState("All");
  const [search, setSearch] = useState("");
  const [collapsedLeagues, setCollapsedLeagues] = useState<Record<string, boolean>>({});
  const [selections, setSelections] = useState<Set<string>>(new Set());

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

  const toggleLeague = (id: string) => setCollapsedLeagues((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleToggle = (game: Game, chip: ChipData) => {
    const newActive = new Set(selections);
    if (newActive.has(chip.id)) {
      newActive.delete(chip.id);
    } else {
      newActive.add(chip.id);
    }
    setSelections(newActive);

    onAddSelection({
      id: chip.id,
      gameId: game.id,
      sport: game.sport,
      matchTitle: game.title,
      type: chip.meta.type,
      selectionName: chip.meta.selectionName,
      odds: chip.value,
      startTime: game.startTime,
      metadata: { ...chip.meta, homeTeam: game.home.name, awayTeam: game.away.name, oddsApiSportKey: game.oddsApiSportKey, legOdds: chip.value }
    });
  };

  const getDynamicSports = () => {
    const categories = new Set<string>();
    liveGames.forEach(g => categories.add(g.sport));
    return Array.from(categories).sort();
  };

  const allAvailableSports = getDynamicSports();
  const coreSportsOrder = ["Football", "Basketball", "Tennis", "American Football", "Ice Hockey", "Baseball"];
  const availableCoreSports = coreSportsOrder.filter(s => allAvailableSports.includes(s));
  const otherSports = allAvailableSports.filter(s => !coreSportsOrder.includes(s));
  const isOtherSportSelected = otherSports.includes(activeSport);

  const filteredGames = liveGames.filter(g => 
    (activeSport === "All" || g.sport === activeSport) &&
    (g.title.toLowerCase().includes(search.toLowerCase()) || 
     g.competition.toLowerCase().includes(search.toLowerCase()))
  );

  const gamesByLeague = filteredGames.reduce((acc, game) => {
    if (!acc[game.competition]) acc[game.competition] = [];
    acc[game.competition].push(game);
    return acc;
  }, {} as Record<string, Game[]>);

  return (
    <div className="verid-oddsboard flex-1 flex flex-col min-h-[500px] max-h-[85vh] md:max-h-full border border-border rounded-xl overflow-hidden shadow-2xl relative" style={{ backgroundColor: "var(--obsidian)" }}>
      <style>{`
        .verid-oddsboard {
          --obsidian: #0a0a0d;
          --surface: #131318;
          --surface-2: #1a1a22;
          --border: #26262f;
          --ink: #f4f4f2;
          --ink-dim: #8b8b96;
          --ink-faint: #55555f;
          --lime: #ccff00;
          --live: #ff5470;
          font-variant-numeric: tabular-nums;
        }
        .verid-oddsboard .text-ink { color: var(--ink); }
        .verid-oddsboard .text-ink-dim { color: var(--ink-dim); }
        .verid-oddsboard .text-ink-faint { color: var(--ink-faint); }
        .verid-oddsboard .text-lime { color: var(--lime); }
        .verid-oddsboard .text-live { color: var(--live); }
        .verid-oddsboard .text-3xs { font-size: 9px; line-height: 1.3; }
        .verid-oddsboard .text-2xs { font-size: 10.5px; line-height: 1.4; }
        .verid-oddsboard .scrollbar-none::-webkit-scrollbar { display: none; }
        .verid-oddsboard .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
        .verid-oddsboard button:focus-visible { outline: 2px solid var(--lime); outline-offset: 2px; border-radius: 4px; }
        @keyframes veridPulse {
          0% { opacity: 0.9; transform: scale(1); }
          70% { opacity: 0; transform: scale(2.1); }
          100% { opacity: 0; transform: scale(2.1); }
        }
        .verid-oddsboard .live-ping { animation: veridPulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .verid-oddsboard .live-ping { animation: none; }
          .verid-oddsboard * { transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Top Search & Tabs */}
      <div className="p-4 border-b flex flex-col xl:flex-row gap-3 xl:items-center" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}>
        <div className="relative w-full xl:max-w-[280px] flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text" 
            placeholder="Search matches or leagues..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-full pl-9 pr-8 py-2 text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--ink)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5" style={{ color: "var(--ink-faint)" }}>
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full xl:w-auto pb-1 xl:pb-0 flex-nowrap shrink-0">
          <button
            onClick={() => setActiveSport("All")}
            className="flex-none flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeSport === "All" ? "var(--lime)" : "var(--surface)",
              color: activeSport === "All" ? "var(--obsidian)" : "var(--ink-dim)",
              border: `1px solid ${activeSport === "All" ? "var(--lime)" : "var(--border)"}`
            }}
          >
            All Sports
          </button>
          
          {availableCoreSports.map((s) => {
            const active = activeSport === s;
            const hasLive = liveGames.some((g) => g.sport === s && g.status.live);
            return (
              <button
                key={s}
                onClick={() => setActiveSport(s)}
                className="flex-none flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border"
                style={{
                  backgroundColor: active ? "var(--lime)" : "var(--surface)",
                  borderColor: active ? "var(--lime)" : "var(--border)",
                  color: active ? "var(--obsidian)" : "var(--ink)",
                }}
              >
                <span className="text-3xs font-mono opacity-70 uppercase">{s.substring(0,3)}</span>
                {s}
                {hasLive && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: active ? "var(--obsidian)" : "var(--live)" }}
                  />
                )}
              </button>
            );
          })}

          {otherSports.length > 0 && (
            <div className="relative flex items-center shrink-0 min-w-[80px]">
              <select 
                value={isOtherSportSelected ? activeSport : ""}
                onChange={(e) => { setActiveSport(e.target.value); (document.activeElement as HTMLElement)?.blur(); }}
                className="appearance-none outline-none flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer pr-8 border"
                style={{
                  backgroundColor: isOtherSportSelected ? "var(--lime)" : "var(--surface)",
                  borderColor: isOtherSportSelected ? "var(--lime)" : "var(--border)",
                  color: isOtherSportSelected ? "var(--obsidian)" : "var(--ink-dim)"
                }}
              >
                <option value="" disabled hidden>More</option>
                {otherSports.map(sport => (
                  <option key={sport} value={sport} style={{ color: "var(--ink)", backgroundColor: "var(--surface)" }}>{sport}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-4">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <CryptoEngineLoader size="md" text="FETCHING LIVE ORACLE DATA..." />
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center p-12 m-4 border border-dashed rounded-xl" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}>
            <p className="text-ink-faint font-medium">No live markets available.</p>
          </div>
        ) : (
          Object.entries(gamesByLeague).map(([leagueName, games]) => (
            <LeagueGroup
              key={leagueName}
              name={leagueName}
              games={games}
              collapsed={!!collapsedLeagues[leagueName]}
              onToggleCollapse={() => toggleLeague(leagueName)}
              selections={selections}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
