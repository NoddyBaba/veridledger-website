require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.from('live_events').select('*').limit(2);
  console.log(JSON.stringify(data[0].odds_data.bookmakers[0], null, 2));
}
check();
