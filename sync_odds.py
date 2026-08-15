import os
import requests
from supabase import create_client

ODDS_API_KEY = "de5675bad8047ae87ed53e9daa98de76"
SUPABASE_URL = "https://epfqvayqqrtpbnlfgidx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnF2YXlxcXJ0cGJubGZnaWR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3ODc5MSwiZXhwIjoyMTAwMDU0NzkxfQ.XwGrNaTBAqK4I37avROF6HE-RWZnXz9zPIfeZxidnWA"

print("Fetching decimal odds from The-Odds-API...")
odds_url = f"https://api.the-odds-api.com/v4/sports/upcoming/odds/?regions=us,uk,eu,au&markets=h2h,spreads,totals&oddsFormat=decimal&apiKey={ODDS_API_KEY}"
response = requests.get(odds_url)
if not response.ok:
    print(f"API error: {response.text}")
    exit(1)

events = response.json()
import datetime

mapped_events = []
for event in events:
    mapped_events.append({
        "id": event["id"],
        "sport_key": event["sport_key"],
        "commence_time": event["commence_time"],
        "home_team": event["home_team"],
        "away_team": event["away_team"],
        "odds_data": event,
        "updated_at": datetime.datetime.now().isoformat(),
    })

print("Upserting into Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
# We need to upsert. The python client syntax:
data, count = supabase.table('live_events').upsert(mapped_events).execute()
print(f"Successfully synced {len(mapped_events)} events!")
