export type TickerItem = {
  id: string;
  league: string;
  lockTime: string;
  status: "LOCKED" | "SETTLED";
};

export const tickerItems: TickerItem[] = [
  { id: "SGN-88214", league: "NBA", lockTime: "18:41:02Z", status: "LOCKED" },
  { id: "SGN-88215", league: "ATP", lockTime: "18:44:37Z", status: "LOCKED" },
  { id: "SGN-88216", league: "MLB", lockTime: "18:52:10Z", status: "SETTLED" },
  { id: "SGN-88217", league: "EPL", lockTime: "19:03:55Z", status: "LOCKED" },
  { id: "SGN-88218", league: "NFL", lockTime: "19:15:21Z", status: "SETTLED" },
  { id: "SGN-88219", league: "NHL", lockTime: "19:22:48Z", status: "LOCKED" },
];

export type Feature = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  mock: "proof" | "roi" | "dashboard";
};

export const features: Feature[] = [
  {
    id: "proof-engine",
    eyebrow: "[ PROOF ]",
    title: "The Proof Engine",
    description: "API-locked signals. Zero edits. Zero deletions.",
    mock: "proof",
  },
  {
    id: "immutable-roi",
    eyebrow: "[ ROI ]",
    title: "Immutable ROI",
    description:
      "Evaluate Analysts based on strict mathematical truth, not marketing noise.",
    mock: "roi",
  },
  {
    id: "allocator-dashboard",
    eyebrow: "[ SOCIAL INTELLIGENCE ]",
    title: "Real-Time Ledger",
    description:
      "A real-time, chronological feed of verified signals, complete with tail tracking and VIP discussion rooms.",
    mock: "dashboard",
  },
];

export type LeaderboardRow = {
  rank: number;
  handle: string;
  focus: string;
  roi: number; // percent, signed
  yield: number; // units, signed
  winRate: number; // percent
};

export const leaderboard: LeaderboardRow[] = [
  {
    rank: 1,
    handle: "@SharpVector",
    focus: "NBA · Player Props",
    roi: 184.2,
    yield: 312.5,
    winRate: 61.4,
  },
  {
    rank: 2,
    handle: "@QuantEdgeNFL",
    focus: "NFL · Sides & Totals",
    roi: 142.7,
    yield: 268.9,
    winRate: 58.9,
  },
  {
    rank: 3,
    handle: "@CoastalHoops",
    focus: "NCAAB · Full Game",
    roi: 121.5,
    yield: 205.3,
    winRate: 57.2,
  },
];
