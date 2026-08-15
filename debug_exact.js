const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://epfqvayqqrtpbnlfgidx.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnF2YXlxcXJ0cGJubGZnaWR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3ODc5MSwiZXhwIjoyMTAwMDU0NzkxfQ.XwGrNaTBAqK4I37avROF6HE-RWZnXz9zPIfeZxidnWA";

function normalizeOdds(odds) {
  const o = parseFloat(odds);
  if (isNaN(o) || o === 0) return 0;
  if (o >= 100) return (o / 100) + 1;
  if (o <= -100) return (100 / Math.abs(o)) + 1;
  return o;
}

function parseTheOddsApiEvent(eventRow) {
  const data = eventRow.odds_data;
  const bookmaker = data.bookmakers?.find((b) => b.key === 'draftkings') || 
                    data.bookmakers?.find((b) => b.key === 'fanduel') || 
                    data.bookmakers?.[0];
                    
  if (!bookmaker) return null; 

  const h2h = bookmaker.markets.find((m) => m.key === 'h2h');
  const totals = bookmaker.markets.find((m) => m.key === 'totals');

  const getOutcome = (market, nameMatcher) => {
    return market?.outcomes?.find((o) => nameMatcher(o.name)) || { price: 0, point: 0 };
  };

  const homeH2H = getOutcome(h2h, (n) => n === data.home_team);
  const awayH2H = getOutcome(h2h, (n) => n === data.away_team);
  const drawH2H = getOutcome(h2h, (n) => n === 'Draw');
  
  const overTotal = getOutcome(totals, (n) => n.toLowerCase() === 'over');
  const underTotal = getOutcome(totals, (n) => n.toLowerCase() === 'under');

  const isSoccer = data.sport_key.toLowerCase().includes('soccer');
  let sportName = data.sport_title;
  if (data.sport_key.toLowerCase().includes('americanfootball') || data.sport_key.toLowerCase().includes('nfl') || data.sport_key.toLowerCase().includes('ncaa')) {
    sportName = "American Football";
  }

  return {
    id: eventRow.id,
  };
}

async function run() {
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabaseAdmin.from('live_events').select('*');
  let failCount = 0;
  for(let row of data) {
      try {
          if (row.sport_key !== 'soccer_api_football') {
             parseTheOddsApiEvent(row);
          }
      } catch(e) {
          console.log("Error on row", row.id, e.message);
          failCount++;
      }
  }
  console.log("Failures:", failCount);
}
run();
