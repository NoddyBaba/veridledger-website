const { createClient } = require('@supabase/supabase-js');

async function check() {
  const SUPABASE_URL = "https://epfqvayqqrtpbnlfgidx.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnF2YXlxcXJ0cGJubGZnaWR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3ODc5MSwiZXhwIjoyMTAwMDU0NzkxfQ.XwGrNaTBAqK4I37avROF6HE-RWZnXz9zPIfeZxidnWA";
  
  const supaRes = await fetch(SUPABASE_URL + "/rest/v1/live_events?select=odds_data&limit=1", {
      headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY
      }
  });

  const data = await supaRes.json();
  console.log(JSON.stringify(data[0].odds_data.bookmakers[0].markets, null, 2));
}

check();
