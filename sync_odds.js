async function sync() {
  const ODDS_API_KEY = "de5675bad8047ae87ed53e9daa98de76";
  
  console.log("Fetching decimal odds from The-Odds-API...");
  const oddsUrl = "https://api.the-odds-api.com/v4/sports/upcoming/odds/?regions=us,uk,eu,au&markets=h2h,spreads,totals&oddsFormat=decimal&apiKey=" + ODDS_API_KEY;
  
  const response = await fetch(oddsUrl);
  if (!response.ok) {
    console.error("API error", await response.text());
    return;
  }
  const events = await response.json();
  
  const mappedEvents = events.map((event) => ({
    id: event.id,
    sport_key: event.sport_key,
    commence_time: event.commence_time,
    home_team: event.home_team,
    away_team: event.away_team,
    odds_data: event,
    updated_at: new Date().toISOString(),
  }));

  console.log("Upserting into Supabase via REST...");
  const SUPABASE_URL = "https://epfqvayqqrtpbnlfgidx.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnF2YXlxcXJ0cGJubGZnaWR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3ODc5MSwiZXhwIjoyMTAwMDU0NzkxfQ.XwGrNaTBAqK4I37avROF6HE-RWZnXz9zPIfeZxidnWA";
  
  const supaRes = await fetch(SUPABASE_URL + "/rest/v1/live_events", {
      method: "POST",
      headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify(mappedEvents)
  });

  if (!supaRes.ok) {
    console.error("Supabase error:", await supaRes.text());
  } else {
    console.log("Successfully synced " + mappedEvents.length + " events!");
  }
}

sync();
