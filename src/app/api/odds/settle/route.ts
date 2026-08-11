import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ODDS_API_KEY = process.env.ODDS_API_KEY;
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

    // Group picks by sport
    const picksBySport = lockedPicks.reduce((acc, pick) => {
      // Parlays are marked as 'Mixed', we skip them in this V1 or grade legs individually if we expand logic.
      // For MVP, we'll only auto-settle single bets.
      if (pick.sport !== 'Mixed') {
        if (!acc[pick.sport]) acc[pick.sport] = [];
        acc[pick.sport].push(pick);
      }
      return acc;
    }, {} as Record<string, any[]>);

    let gradedCount = 0;
    const gradingResults = [];

    // 2. Iterate through each sport and fetch scores
    for (const [sport, picks] of Object.entries(picksBySport)) {
      const response = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`);
      
      if (!response.ok) {
        console.error(`Failed to fetch scores for ${sport}`);
        continue;
      }

      const scoresData = await response.json();

      // 3. Grade each pick
      for (const pick of (picks as any[])) {
        if (!pick.selection_metadata) continue; // Cannot auto-grade without metadata
        
        const meta = pick.selection_metadata;
        
        // Find matching game
        const game = scoresData.find((g: any) => 
          g.home_team === meta.homeTeam && g.away_team === meta.awayTeam
        );

        if (!game || !game.completed || !game.scores) continue; // Game not finished yet

        // Extract scores
        const homeScoreObj = game.scores.find((s: any) => s.name === game.home_team);
        const awayScoreObj = game.scores.find((s: any) => s.name === game.away_team);

        if (!homeScoreObj || !awayScoreObj) continue;

        const homeScore = parseInt(homeScoreObj.score);
        const awayScore = parseInt(awayScoreObj.score);
        let newStatus = 'LOCKED';

        // Grading Logic
        if (meta.type === 'over' || meta.type === 'under') {
          const totalScore = homeScore + awayScore;
          if (meta.type === 'over') {
            newStatus = totalScore > meta.line ? 'WIN' : (totalScore === meta.line ? 'PUSH' : 'LOSS');
          } else {
            newStatus = totalScore < meta.line ? 'WIN' : (totalScore === meta.line ? 'PUSH' : 'LOSS');
          }
        } else if (meta.line !== undefined) {
          // Spread
          const margin = meta.team === game.home_team 
            ? homeScore - awayScore 
            : awayScore - homeScore;
          
          if (margin + meta.line > 0) newStatus = 'WIN';
          else if (margin + meta.line === 0) newStatus = 'PUSH';
          else newStatus = 'LOSS';
        } else {
          // Moneyline
          if (homeScore === awayScore) {
            newStatus = 'PUSH';
          } else {
            const winner = homeScore > awayScore ? game.home_team : game.away_team;
            newStatus = meta.team === winner ? 'WIN' : 'LOSS';
          }
        }

        if (newStatus !== 'LOCKED') {
          // 4. Update Database
          await supabase.from('picks').update({ status: newStatus }).eq('id', pick.id);
          gradedCount++;
          gradingResults.push({ id: pick.id, match: pick.match_title, result: newStatus });
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
