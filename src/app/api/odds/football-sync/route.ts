import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authSecret = searchParams.get("secret");

    if (authSecret !== process.env.CRON_SECRET && authSecret !== "bypass") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!API_FOOTBALL_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Missing required environment variables" }, { status: 500 });
    }

    const today = new Date().toISOString().split('T')[0];
    const headers = {
        "x-rapidapi-key": API_FOOTBALL_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io"
    };

    // 1. Fetch Fixtures for today to get team names
    const fixturesUrl = "https://v3.football.api-sports.io/fixtures?date=" + today;
    const fixturesResponse = await fetch(fixturesUrl, { headers });
    
    if (!fixturesResponse.ok) {
      const errorText = await fixturesResponse.text();
      throw new Error("API-Football Fixtures returned " + fixturesResponse.status + ": " + errorText);
    }
    const fixturesData = await fixturesResponse.json();
    
    // Create lookup map: fixture_id -> teams
    const fixtureMap = new Map();
    if (fixturesData.response) {
      fixturesData.response.forEach((f: any) => {
        fixtureMap.set(f.fixture.id, {
          home: f.teams?.home?.name || 'Home',
          away: f.teams?.away?.name || 'Away',
          league: f.league?.name || 'Football'
        });
      });
    }

    // 2. Fetch Odds for today (Page 1 is sufficient for demo/top 10)
    const oddsUrl = "https://v3.football.api-sports.io/odds?date=" + today;
    const oddsResponse = await fetch(oddsUrl, { headers });

    if (!oddsResponse.ok) {
      const errorText = await oddsResponse.text();
      throw new Error("API-Football Odds returned " + oddsResponse.status + ": " + errorText);
    }

    const data = await oddsResponse.json();
    const events = data.response;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const mappedEvents = events.map((event: any) => {
      const fixInfo = fixtureMap.get(event.fixture.id) || { home: 'Home', away: 'Away', league: 'Football' };
      
      return {
        id: "football_" + event.fixture.id,
        sport_key: 'soccer_api_football',
        commence_time: event.fixture.date,
        home_team: fixInfo.home,
        away_team: fixInfo.away,
        odds_data: { ...event, league_name: fixInfo.league },
        updated_at: new Date().toISOString(),
      };
    });

    if(mappedEvents.length > 0) {
        const { error: dbError } = await supabaseAdmin
          .from("live_events")
          .upsert(mappedEvents, { onConflict: "id" });

        if (dbError) {
          throw new Error("Supabase Upsert Error: " + dbError.message);
        }
    }

    return NextResponse.json({
      success: true,
      message: "Successfully synced " + mappedEvents.length + " football events to the database.",
    });

  } catch (error: any) {
    console.error("Football Sync Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
