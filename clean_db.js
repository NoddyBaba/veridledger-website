const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://epfqvayqqrtpbnlfgidx.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnF2YXlxcXJ0cGJubGZnaWR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3ODc5MSwiZXhwIjoyMTAwMDU0NzkxfQ.XwGrNaTBAqK4I37avROF6HE-RWZnXz9zPIfeZxidnWA";

async function run() {
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Delete all old soccer events from The-Odds-API
  const { data, error } = await supabaseAdmin
    .from('live_events')
    .delete()
    .like('sport_key', 'soccer_%')
    .neq('sport_key', 'soccer_api_football');
    
  console.log("Deleted old soccer events", error);
}
run();
