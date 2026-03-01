import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface IndianCityRaw {
  id: string;
  name: string;
  state: string;
}

interface IndianCityResponse {
  city: string;
  state: string;
}

// In-memory cache (survives across requests in the same serverless instance)
let cachedCities: IndianCityResponse[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchCitiesFromAPI(): Promise<IndianCityResponse[]> {
  // Primary: CountriesNow API — get all states, then cities per state
  // Fallback: GitHub JSON with 1085 Indian cities

  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json',
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);

    const raw: IndianCityRaw[] = await res.json();

    return raw
      .map((item) => ({ city: item.name, state: item.state }))
      .sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city));
  } catch (error) {
    console.error('[Indian Cities API] Primary source failed, trying fallback...', error);

    // Fallback: CountriesNow single-country cities endpoint
    const res = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'India' }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`CountriesNow fetch failed: ${res.status}`);

    const json = await res.json();
    const cityNames: string[] = json.data || [];

    // CountriesNow cities endpoint doesn't include state, so we return with empty state
    return cityNames.map((name) => ({ city: name, state: '' })).sort((a, b) => a.city.localeCompare(b.city));
  }
}

export async function GET() {
  try {
    const now = Date.now();

    if (cachedCities && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cachedCities });
    }

    const cities = await fetchCitiesFromAPI();
    cachedCities = cities;
    cacheTimestamp = now;

    return NextResponse.json({ success: true, data: cities });
  } catch (error) {
    console.error('[Indian Cities API] All sources failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Indian cities' },
      { status: 502 }
    );
  }
}
