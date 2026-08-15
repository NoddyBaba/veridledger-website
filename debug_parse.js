const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://epfqvayqqrtpbnlfgidx.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnF2YXlxcXJ0cGJubGZnaWR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3ODc5MSwiZXhwIjoyMTAwMDU0NzkxfQ.XwGrNaTBAqK4I37avROF6HE-RWZnXz9zPIfeZxidnWA";

async function run() {
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabaseAdmin.from('live_events').select('*');
  console.log("Total events:", data.length);
  let failCount = 0;
  for(let row of data) {
      try {
          if (row.sport_key === 'soccer_api_football') {
              const odds = row.odds_data;
              if(!odds || !odds.bookmakers) throw new Error("No bookmakers");
          } else {
              const odds = row.odds_data;
              if(!odds) throw new Error("no odds data");
              if(!odds.sport_key) throw new Error("Missing sport_key for " + row.id);
          }
      } catch(e) {
          console.log("Error on row", row.id, e.message);
          failCount++;
      }
  }
  console.log("Failures:", failCount);
}
run();
