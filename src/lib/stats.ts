export type PickStats = {
  sport?: string;
  match_title?: string;
  selection?: string;
  odds: number;
  stake: number;
  status: "LOCKED" | "WIN" | "LOSS" | "PUSH";
};

export function calculateProfit(stake: number, odds: number): number {
  if (odds > 0) {
    return stake * (odds / 100);
  } else {
    return stake / (Math.abs(odds) / 100);
  }
}

export function americanToDecimal(odds: number): number {
  if (odds > 0) {
    return (odds / 100) + 1;
  } else {
    return (100 / Math.abs(odds)) + 1;
  }
}

export function calculateAnalystStats(picks: PickStats[]) {
  let totalGraded = 0;
  let wins = 0;
  let netUnits = 0;
  let totalStakedOnGraded = 0;
  let totalDecimalOdds = 0;
  
  const trend: number[] = [];
  const sportCounts: Record<string, number> = {};

  for (const pick of picks) {
    // Count sports for category determination (including unqualified)
    if (pick.sport) {
      sportCounts[pick.sport] = (sportCounts[pick.sport] || 0) + 1;
    }

    if (pick.status === "LOCKED") continue;

    const decimalOdds = americanToDecimal(pick.odds);

    // Minimum Odds Qualifier: Ignore picks < 1.30 for leaderboard scoring
    if (decimalOdds < 1.30) continue;

    if (pick.status !== "PUSH") {
      totalStakedOnGraded += pick.stake;
      totalGraded += 1;
      totalDecimalOdds += decimalOdds;
    }

    if (pick.status === "WIN") {
      wins += 1;
      netUnits += calculateProfit(pick.stake, pick.odds);
      trend.push(Number(netUnits.toFixed(2)));
    } else if (pick.status === "LOSS") {
      netUnits -= pick.stake;
      trend.push(Number(netUnits.toFixed(2)));
    } else if (pick.status === "PUSH") {
      trend.push(Number(netUnits.toFixed(2)));
    }
  }

  // Determine primary category
  let primaryCategory = "All Markets";
  let maxCount = 0;
  for (const [sport, count] of Object.entries(sportCounts)) {
    if (count > maxCount) {
      maxCount = count;
      primaryCategory = sport;
    }
  }

  const winRate = totalGraded > 0 ? (wins / totalGraded) * 100 : 0;
  const roi = totalStakedOnGraded > 0 ? (netUnits / totalStakedOnGraded) * 100 : 0;
  const averageOdds = totalGraded > 0 ? totalDecimalOdds / totalGraded : 0;

  return {
    netUnits: Number(netUnits.toFixed(2)),
    winRate: Number(winRate.toFixed(1)),
    roi: Number(roi.toFixed(1)),
    averageOdds: Number(averageOdds.toFixed(2)),
    totalGraded,
    wins,
    trend: trend.length > 0 ? trend : [0], // Default 0 to avoid empty charts
    category: primaryCategory
  };
}
