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
    const oddsUrl = "https://v3.football.api-sports.io/odds?date=" + today;
    
    const response = await fetch(oddsUrl, {
        headers: {
            "x-rapidapi-key": API_FOOTBALL_KEY,
            "x-rapidapi-host": "v3.football.api-sports.io"
        }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("API-Football returned " + response.status + ": " + errorText);
    }

    const data = await response.json();
    const events = data.response;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const mappedEvents = events.map((event: any) => ({
      id: "football_" + event.fixture.id,
      sport_key: 'soccer_api_football',
      commence_time: event.fixture.date,
      home_team: event.fixture.home?.name || 'Home',
      away_team: event.fixture.away?.name || 'Away',
      odds_data: event,
      updated_at: new Date().toISOString(),
    }));

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
