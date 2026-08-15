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

function parseApiFootballEvent(eventRow) {
  const data = eventRow.odds_data;
  const bookmaker = data.bookmakers?.[0]; 
  if (!bookmaker) return null;

  const matchWinner = bookmaker.markets.find((m) => m.id === 1 || m.name === "Match Winner");
  const goalsOverUnder = bookmaker.markets.find((m) => m.id === 5 || m.name === "Goals Over/Under");

  const getVal = (market, valStr) => {
    const v = market?.values?.find((v) => v.value === valStr);
    return v ? normalizeOdds(v.odd) : 0;
  };

  const over25 = goalsOverUnder?.values?.find((v) => v.value === "Over 2.5")?.odd;
  const under25 = goalsOverUnder?.values?.find((v) => v.value === "Under 2.5")?.odd;

  return {
    id: eventRow.id,
    markets: {
      ml: {
        home: { name: eventRow.home_team, odds: getVal(matchWinner, "Home") },
        draw: { name: "Draw", odds: getVal(matchWinner, "Draw") },
        away: { name: eventRow.away_team, odds: getVal(matchWinner, "Away") }
      },
      total: {
        over: { line: "O 2.5", odds: over25 ? normalizeOdds(over25) : 0 },
        under: { line: "U 2.5", odds: under25 ? normalizeOdds(under25) : 0 }
      }
    }
  };
}

async function run() {
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabaseAdmin.from('live_events').select('*');
  let failCount = 0;
  for(let row of data) {
      try {
          if (row.sport_key === 'soccer_api_football') {
             parseApiFootballEvent(row);
          }
      } catch(e) {
          console.log("Error on row", row.id, e.message);
          failCount++;
      }
  }
  console.log("Failures:", failCount);
}
run();
