import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase admin client to bypass RLS for grading
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'ODDS_API_KEY missing' }, { status: 500 });
  }

  try {
    // 1. Fetch all LOCKED picks where the game has started
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

    // Separate picks by API source
    const footballPicks = lockedPicks.filter(p => p.sport === 'Football');
    const oddsApiPicks = lockedPicks.filter(p => p.sport !== 'Football' && p.sport !== 'Mixed');
    // Parlays ('Mixed') are skipped in this V1 logic

    // --- GRADE API-FOOTBALL (SOCCER) PICKS ---
    if (footballPicks.length > 0 && API_FOOTBALL_KEY) {
      // Group football picks by date
      const footballPicksByDate = footballPicks.reduce((acc, pick) => {
        const dateStr = new Date(pick.game_start_time).toISOString().split('T')[0];
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(pick);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [date, picks] of Object.entries(footballPicksByDate)) {
        const headers = {
          "x-rapidapi-key": API_FOOTBALL_KEY,
          "x-rapidapi-host": "v3.football.api-sports.io"
        };
        const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, { headers });
        if (!response.ok) {
          console.error(`Failed to fetch API-Football fixtures for ${date}`);
          continue;
        }
        const data = await response.json();
        const fixtures = data.response || [];

        for (const pick of (picks as any[])) {
          if (!pick.selection_metadata) continue;
          const meta = pick.selection_metadata;
          const titleParts = pick.match_title.split(' vs ');
          const homeTeam = meta.homeTeam || titleParts[0];
          const awayTeam = meta.awayTeam || titleParts[1];

          // Find matching game
          const game = fixtures.find((g: any) => 
            g.teams.home.name === homeTeam && g.teams.away.name === awayTeam
          );

          if (!game) continue;
          
          // Check if match is finished (FT, AET, PEN)
          const status = game.fixture.status.short;
          if (!['FT', 'AET', 'PEN'].includes(status)) continue;

          const homeScore = game.goals.home;
          const awayScore = game.goals.away;
          if (homeScore === null || awayScore === null) continue;

          let newStatus = 'LOCKED';

          // Grading Logic
          if (meta.type === 'over' || meta.type === 'under') {
            // For goals over/under, sometimes line isn't cleanly stored, fallback to 2.5
            const line = meta.line !== undefined ? meta.line : 2.5;
            const totalScore = homeScore + awayScore;
            if (meta.type === 'over') {
              newStatus = totalScore > line ? 'WIN' : (totalScore === line ? 'PUSH' : 'LOSS');
            } else {
              newStatus = totalScore < line ? 'WIN' : (totalScore === line ? 'PUSH' : 'LOSS');
            }
          } else {
            // Moneyline (1X2)
            if (homeScore === awayScore) {
              if (meta.team === 'Draw') newStatus = 'WIN';
              else newStatus = 'LOSS';
            } else {
              const winner = homeScore > awayScore ? homeTeam : awayTeam;
              if (meta.team === 'Draw') newStatus = 'LOSS';
              else newStatus = meta.team === winner ? 'WIN' : 'LOSS';
            }
          }

          if (newStatus !== 'LOCKED') {
            await supabase.from('picks').update({ status: newStatus }).eq('id', pick.id);
            gradedCount++;
            gradingResults.push({ id: pick.id, match: pick.match_title, result: newStatus });
          }
        }
      }
    }

    // --- GRADE THE-ODDS-API PICKS ---
    if (oddsApiPicks.length > 0) {
      const picksBySport = oddsApiPicks.reduce((acc, pick) => {
        if (!acc[pick.sport]) acc[pick.sport] = [];
        acc[pick.sport].push(pick);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [sport, picks] of Object.entries(picksBySport)) {
        // Map our friendly sport names back to The-Odds-API keys
        let oddsApiSportKey = sport;
        if (sport === 'American Football') oddsApiSportKey = 'americanfootball_nfl'; // Simple fallback
        else if (sport === 'Basketball') oddsApiSportKey = 'basketball_nba';
        else if (sport === 'Ice Hockey') oddsApiSportKey = 'icehockey_nhl';
        else if (sport === 'Baseball') oddsApiSportKey = 'baseball_mlb';
        // Note: For a robust system we should save the exact sport_key in metadata, but this works for MVP

        // We fetch multiple days back just in case
        const response = await fetch(`https://api.the-odds-api.com/v4/sports/${oddsApiSportKey}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`);
        
        if (!response.ok) {
          console.error(`Failed to fetch scores for ${oddsApiSportKey}`);
          continue;
        }

        const scoresData = await response.json();

        for (const pick of (picks as any[])) {
          if (!pick.selection_metadata) continue;
          
          const meta = pick.selection_metadata;
          const titleParts = pick.match_title.split(' vs ');
          const homeTeam = meta.homeTeam || titleParts[0];
          const awayTeam = meta.awayTeam || titleParts[1];
          
          const game = scoresData.find((g: any) => 
            g.home_team === homeTeam && g.away_team === awayTeam
          );

          if (!game || !game.completed || !game.scores) continue; 

          const homeScoreObj = game.scores.find((s: any) => s.name === game.home_team);
          const awayScoreObj = game.scores.find((s: any) => s.name === game.away_team);

          if (!homeScoreObj || !awayScoreObj) continue;

          const homeScore = parseInt(homeScoreObj.score);
          const awayScore = parseInt(awayScoreObj.score);
          let newStatus = 'LOCKED';

          if (meta.type === 'over' || meta.type === 'under') {
            const line = meta.line !== undefined ? meta.line : (meta.type === 'over' ? 0 : 999);
            const totalScore = homeScore + awayScore;
            if (meta.type === 'over') {
              newStatus = totalScore > line ? 'WIN' : (totalScore === line ? 'PUSH' : 'LOSS');
            } else {
              newStatus = totalScore < line ? 'WIN' : (totalScore === line ? 'PUSH' : 'LOSS');
            }
          } else if (meta.line !== undefined) {
            // Spread
            const margin = meta.team === game.home_team ? homeScore - awayScore : awayScore - homeScore;
            if (margin + meta.line > 0) newStatus = 'WIN';
            else if (margin + meta.line === 0) newStatus = 'PUSH';
            else newStatus = 'LOSS';
          } else {
            // Moneyline
            if (homeScore === awayScore) {
              if (meta.team === 'Draw') newStatus = 'WIN';
              else newStatus = 'PUSH'; // US Sports typically push on ties for ML
            } else {
              const winner = homeScore > awayScore ? game.home_team : game.away_team;
              if (meta.team === 'Draw') newStatus = 'LOSS';
              else newStatus = meta.team === winner ? 'WIN' : 'LOSS';
            }
          }

          if (newStatus !== 'LOCKED') {
            await supabase.from('picks').update({ status: newStatus }).eq('id', pick.id);
            gradedCount++;
            gradingResults.push({ id: pick.id, match: pick.match_title, result: newStatus });
          }
        }
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
