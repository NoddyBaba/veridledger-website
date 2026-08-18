import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase admin client to bypass RLS for grading
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const maxDuration = 60; // Allow more time for accumulator fetches
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'Missing ODDS_API_KEY environment variable.' }, { status: 500 });
  }

  try {
    const { data: lockedPicks, error: fetchError } = await supabase
      .from('picks')
      .select('*')
      .eq('status', 'LOCKED')
      .lt('game_start_time', new Date().toISOString());

    if (fetchError) throw new Error(`Failed to fetch picks: ${fetchError.message}`);
    if (!lockedPicks || lockedPicks.length === 0) {
      return NextResponse.json({ message: 'No locked picks to settle.' });
    }

    let gradedCount = 0;
    const gradingResults = [];

    // Separate picks by type
    const footballPicks = lockedPicks.filter(p => p.sport === 'Football');
    const oddsApiPicks = lockedPicks.filter(p => p.sport !== 'Football' && p.sport !== 'Mixed');
    const accumulatorPicks = lockedPicks.filter(p => p.sport === 'Mixed');

    // --- HELPER: Grade Football Leg ---
    const gradeFootballLeg = (meta: any, game: any) => {
      const homeScore = game.goals.home;
      const awayScore = game.goals.away;
      if (homeScore === null || awayScore === null) return 'LOCKED';
      let status = 'LOCKED';
      
      if (meta.type === 'over' || meta.type === 'under') {
        const line = meta.line !== undefined ? meta.line : 2.5;
        const totalScore = homeScore + awayScore;
        if (meta.type === 'over') {
          status = totalScore > line ? 'WIN' : (totalScore === line ? 'VOID' : 'LOSS');
        } else {
          status = totalScore < line ? 'WIN' : (totalScore === line ? 'VOID' : 'LOSS');
        }
      } else {
        if (homeScore === awayScore) {
          if (meta.team === 'Draw') status = 'WIN';
          else status = 'LOSS'; // Moneyline ties on 3-way soccer are LOSS unless bet is Draw
        } else {
          const winner = homeScore > awayScore ? meta.homeTeam : meta.awayTeam;
          if (meta.team === 'Draw') status = 'LOSS';
          else status = meta.team === winner ? 'WIN' : 'LOSS';
        }
      }
      return status;
    };

    // --- HELPER: Grade OddsAPI Leg ---
    const gradeOddsApiLeg = (meta: any, game: any) => {
      const homeScoreObj = game.scores.find((s: any) => s.name === game.home_team);
      const awayScoreObj = game.scores.find((s: any) => s.name === game.away_team);
      if (!homeScoreObj || !awayScoreObj) return 'LOCKED';
      const homeScore = parseInt(homeScoreObj.score);
      const awayScore = parseInt(awayScoreObj.score);
      let status = 'LOCKED';

      if (meta.type === 'over' || meta.type === 'under') {
        const line = meta.line !== undefined ? meta.line : (meta.type === 'over' ? 0 : 999);
        const totalScore = homeScore + awayScore;
        if (meta.type === 'over') {
          status = totalScore > line ? 'WIN' : (totalScore === line ? 'VOID' : 'LOSS');
        } else {
          status = totalScore < line ? 'WIN' : (totalScore === line ? 'VOID' : 'LOSS');
        }
      } else if (meta.line !== undefined) { // Spread
        const margin = meta.team === game.home_team ? homeScore - awayScore : awayScore - homeScore;
        if (margin + meta.line > 0) status = 'WIN';
        else if (margin + meta.line === 0) status = 'VOID';
        else status = 'LOSS';
      } else { // Moneyline
        if (homeScore === awayScore) {
          if (meta.team === 'Draw') status = 'WIN';
          else status = 'VOID'; // US Sports push/void on ties for ML
        } else {
          const winner = homeScore > awayScore ? game.home_team : game.away_team;
          if (meta.team === 'Draw') status = 'LOSS';
          else status = meta.team === winner ? 'WIN' : 'LOSS';
        }
      }
      return status;
    };

    // Data caches
    const footballFixturesByDate: Record<string, any[]> = {};
    const fetchFootballFixtures = async (date: string) => {
      if (footballFixturesByDate[date]) return footballFixturesByDate[date];
      if (!API_FOOTBALL_KEY) return [];
      const headers = { "x-rapidapi-key": API_FOOTBALL_KEY, "x-rapidapi-host": "v3.football.api-sports.io" };
      const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, { headers });
      if (!response.ok) return [];
      const data = await response.json();
      footballFixturesByDate[date] = data.response || [];
      return footballFixturesByDate[date];
    };

    const oddsApiScoresByKey: Record<string, any[]> = {};
    const fetchOddsApiScores = async (sportKey: string) => {
      if (oddsApiScoresByKey[sportKey]) return oddsApiScoresByKey[sportKey];
      const response = await fetch(`https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`);
      if (response.ok) oddsApiScoresByKey[sportKey] = await response.json();
      else oddsApiScoresByKey[sportKey] = [];
      return oddsApiScoresByKey[sportKey];
    };

    // --- GRADE API-FOOTBALL (SOCCER) PICKS ---
    for (const pick of footballPicks) {
      if (!pick.selection_metadata) continue;
      const meta = pick.selection_metadata;
      const dateStr = new Date(pick.game_start_time).toISOString().split('T')[0];
      const fixtures = await fetchFootballFixtures(dateStr);
      
      const homeTeam = meta.homeTeam || pick.match_title.split(' vs ')[0];
      const awayTeam = meta.awayTeam || pick.match_title.split(' vs ')[1];
      const game = fixtures.find((g: any) => g.teams.home.name === homeTeam && g.teams.away.name === awayTeam);
      
      if (!game || !['FT', 'AET', 'PEN'].includes(game.fixture.status.short)) continue;
      
      const newStatus = gradeFootballLeg(meta, game);
      if (newStatus !== 'LOCKED') {
        const updateData = { status: newStatus };
        if (newStatus === 'VOID') Object.assign(updateData, { odds: 1.0 });
        await supabase.from('picks').update(updateData).eq('id', pick.id);
        gradedCount++;
        gradingResults.push({ id: pick.id, result: newStatus });
      }
    }

    // --- GRADE THE-ODDS-API PICKS ---
    for (const pick of oddsApiPicks) {
      if (!pick.selection_metadata) continue;
      const meta = pick.selection_metadata;
      
      let sportKeys = meta.oddsApiSportKey ? [meta.oddsApiSportKey] : [];
      if (sportKeys.length === 0) {
        if (pick.sport === 'American Football') sportKeys = ['americanfootball_nfl'];
        else if (pick.sport === 'Basketball') sportKeys = ['basketball_nba'];
        else if (pick.sport === 'Ice Hockey') sportKeys = ['icehockey_nhl'];
        else if (pick.sport === 'Baseball') sportKeys = ['baseball_mlb'];
        else if (pick.sport === 'Tennis') sportKeys = ['tennis_atp', 'tennis_wta'];
        else if (pick.sport === 'Boxing') sportKeys = ['boxing_boxing'];
        else if (pick.sport === 'MMA') sportKeys = ['mma_mixed_martial_arts'];
        else if (pick.sport === 'Aussie Rules') sportKeys = ['aussierules_afl'];
      }
      
      let newStatus = 'LOCKED';
      const homeTeam = meta.homeTeam || pick.match_title.split(' vs ')[0];
      const awayTeam = meta.awayTeam || pick.match_title.split(' vs ')[1];

      for (const key of sportKeys) {
        const scores = await fetchOddsApiScores(key);
        const game = scores.find((g: any) => g.home_team === homeTeam && g.away_team === awayTeam);
        if (game && game.completed && game.scores) {
          newStatus = gradeOddsApiLeg(meta, game);
          break;
        }
      }

      if (newStatus !== 'LOCKED') {
        const updateData = { status: newStatus };
        if (newStatus === 'VOID') Object.assign(updateData, { odds: 1.0 });
        await supabase.from('picks').update(updateData).eq('id', pick.id);
        gradedCount++;
        gradingResults.push({ id: pick.id, result: newStatus });
      }
    }

    // --- GRADE ACCUMULATOR PICKS ---
    for (const pick of accumulatorPicks) {
      if (!pick.selection_metadata || !Array.isArray(pick.selection_metadata)) continue;
      const legs = pick.selection_metadata;
      
      let accumulatorStatus = 'LOCKED';
      let pendingLegs = 0;
      let hasLoss = false;
      let hasWin = false;
      
      // Store graded statuses so we can calculate final odds
      for (const leg of legs) {
        let legStatus = 'LOCKED';
        const homeTeam = leg.homeTeam;
        const awayTeam = leg.awayTeam;

        if (leg.sport === 'Football') {
           const dateStr = new Date(pick.game_start_time).toISOString().split('T')[0];
           const fixtures = await fetchFootballFixtures(dateStr);
           const game = fixtures.find((g: any) => g.teams.home.name === homeTeam && g.teams.away.name === awayTeam);
           if (game && ['FT', 'AET', 'PEN'].includes(game.fixture.status.short)) {
             legStatus = gradeFootballLeg(leg, game);
           }
        } else {
           let sportKeys = leg.oddsApiSportKey ? [leg.oddsApiSportKey] : [];
           if (sportKeys.length === 0) {
             if (leg.sport === 'American Football') sportKeys = ['americanfootball_nfl'];
             else if (leg.sport === 'Basketball') sportKeys = ['basketball_nba'];
             else if (leg.sport === 'Ice Hockey') sportKeys = ['icehockey_nhl'];
             else if (leg.sport === 'Baseball') sportKeys = ['baseball_mlb'];
             else if (leg.sport === 'Tennis') sportKeys = ['tennis_atp', 'tennis_wta'];
             else if (leg.sport === 'Boxing') sportKeys = ['boxing_boxing'];
             else if (leg.sport === 'MMA') sportKeys = ['mma_mixed_martial_arts'];
             else if (leg.sport === 'Aussie Rules') sportKeys = ['aussierules_afl'];
           }
           for (const key of sportKeys) {
             const scores = await fetchOddsApiScores(key);
             const game = scores.find((g: any) => g.home_team === homeTeam && g.away_team === awayTeam);
             if (game && game.completed && game.scores) {
               legStatus = gradeOddsApiLeg(leg, game);
               break;
             }
           }
        }
        
        leg.finalStatus = legStatus; // Tag it on the memory object
        
        if (legStatus === 'LOSS') hasLoss = true;
        else if (legStatus === 'WIN') hasWin = true;
        else if (legStatus === 'LOCKED') pendingLegs++;
      }

      // Evaluate Accumulator Final Status
      if (hasLoss) {
        accumulatorStatus = 'LOSS';
      } else if (pendingLegs === 0) {
        // No pending legs, no losses!
        if (!hasWin) {
          // If every single leg pushed/voided
          accumulatorStatus = 'VOID';
        } else {
          accumulatorStatus = 'WIN';
        }
      }

      if (accumulatorStatus !== 'LOCKED') {
        const updateData: any = { status: accumulatorStatus };
        
        // Recalculate multiplier for WIN or VOID (a full VOID ticket is just odds 1.0)
        if (accumulatorStatus === 'VOID') {
           updateData.odds = 1.0;
        } else if (accumulatorStatus === 'WIN') {
           let calculatedOdds = 1.0;
           let hasAllLegOdds = true;
           for (const leg of legs) {
             if (leg.finalStatus === 'WIN') {
               if (leg.legOdds && leg.legOdds > 1.0) {
                 calculatedOdds *= leg.legOdds;
               } else {
                 hasAllLegOdds = false;
               }
             } else if (leg.finalStatus === 'VOID') {
               calculatedOdds *= 1.0; // Void drops to 1.0 multiplier
             }
           }
           
           // If it's a win but we couldn't calculate dynamically because old picks don't have legOdds
           if (!hasAllLegOdds) {
              // We just give them their original ticket odds (they get lucky if there was a void)
              updateData.odds = pick.odds;
           } else {
              updateData.odds = calculatedOdds;
           }
        }

        await supabase.from('picks').update(updateData).eq('id', pick.id);
        gradedCount++;
        gradingResults.push({ id: pick.id, result: accumulatorStatus });
      }
    }

    return NextResponse.json({ 
      message: `Settlement complete. Graded ${gradedCount} picks.`,
      results: gradingResults
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
