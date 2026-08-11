import { NextResponse } from 'next/server';
import { parseDraftKingsLink } from '@/lib/parsers/draftkings';
import { parseFanDuelLink } from '@/lib/parsers/fanduel';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    // Delay to simulate scraping time
    await new Promise(res => setTimeout(res, 1500));

    // Routing Engine
    if (url.toLowerCase().includes('draftkings.com')) {
      const selections = await parseDraftKingsLink(url);
      return NextResponse.json({ success: true, platform: 'DraftKings', selections });
    } 
    
    if (url.toLowerCase().includes('fanduel.com')) {
      const selections = await parseFanDuelLink(url);
      return NextResponse.json({ success: true, platform: 'FanDuel', selections });
    }

    // Unsupported platform
    return NextResponse.json({ 
      error: 'Unsupported platform. Currently, only DraftKings and FanDuel share links are supported.' 
    }, { status: 400 });

  } catch (error: any) {
    console.error("Link Parsing Error:", error);
    return NextResponse.json({ error: 'Failed to parse slip. Please check the URL and try again.' }, { status: 500 });
  }
}
