import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase admin client to bypass RLS for grading
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST() {
  try {
    // 1. Fetch all LOCKED picks across the entire platform
    const { data: lockedPicks, error: fetchError } = await supabase
      .from('picks')
      .select('*')
      .eq('status', 'LOCKED');

    if (fetchError) throw new Error(`Failed to fetch picks: ${fetchError.message}`);
    if (!lockedPicks || lockedPicks.length === 0) {
      return NextResponse.json({ message: 'No locked picks to simulate settlement.' });
    }

    let gradedCount = 0;
    const gradingResults = [];

    // 2. Iterate and assign random grades
    for (const pick of lockedPicks) {
      const rand = Math.random();
      let newStatus = 'LOCKED';
      
      // 50% Win, 45% Loss, 5% Push
      if (rand < 0.50) newStatus = 'WIN';
      else if (rand < 0.95) newStatus = 'LOSS';
      else newStatus = 'PUSH';

      // 3. Update Database
      const { error: updateError } = await supabase.from('picks').update({ status: newStatus }).eq('id', pick.id);
      
      if (!updateError) {
        gradedCount++;
        gradingResults.push({ id: pick.id, match: pick.match_title, result: newStatus });
      } else {
        console.error(`Error updating pick ${pick.id}:`, updateError);
      }
    }

    return NextResponse.json({ 
      message: `Mock Settlement complete. Randomly graded ${gradedCount} picks.`,
      results: gradingResults
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
