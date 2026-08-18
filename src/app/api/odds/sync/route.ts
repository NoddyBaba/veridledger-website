import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic"; // Ensure it's not cached

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authSecret = searchParams.get("secret");

    if (authSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ODDS_API_KEY = process.env.ODDS_API_KEY;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!ODDS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Missing required environment variables" }, { status: 500 });
    }

    // 1. Fetch live odds from The-Odds-API (Upcoming games across ALL global regions: US, UK, EU, AU)
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/upcoming/odds/?regions=us,uk,eu,au&markets=h2h,spreads,totals&oddsFormat=decimal&apiKey=${ODDS_API_KEY}`;
    
    const response = await fetch(oddsUrl);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`The-Odds-API returned ${response.status}: ${errorText}`);
    }

    const allEvents = await response.json();
    
    const events = allEvents.filter((e: any) => !e.sport_key.toLowerCase().includes("soccer"));

    // 2. Initialize Supabase with the Service Role Key to bypass RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Format the data for our live_events table
    const mappedEvents = events.map((event: any) => ({
      id: event.id,
      sport_key: event.sport_key,
      commence_time: event.commence_time,
      home_team: event.home_team,
      away_team: event.away_team,
      odds_data: event,
      updated_at: new Date().toISOString(),
    }));

    // 4. Upsert into Supabase
    // We do an upsert based on the 'id' primary key.
    const { error: dbError } = await supabaseAdmin
      .from("live_events")
      .upsert(mappedEvents, { onConflict: "id" });

    if (dbError) {
      throw new Error(`Supabase Upsert Error: ${dbError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${mappedEvents.length} live events to the database.`,
    });

  } catch (error: any) {
    console.error("Odds Sync Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
