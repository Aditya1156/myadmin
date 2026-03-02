import { prisma } from '@/lib/prisma';

// State code mapping (Indian states)
const STATE_CODES: Record<string, string> = {
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  'assam': 'AS',
  'bihar': 'BR',
  'chhattisgarh': 'CG',
  'goa': 'GA',
  'gujarat': 'GJ',
  'haryana': 'HR',
  'himachal pradesh': 'HP',
  'jharkhand': 'JH',
  'karnataka': 'KA',
  'kerala': 'KL',
  'madhya pradesh': 'MP',
  'maharashtra': 'MH',
  'manipur': 'MN',
  'meghalaya': 'ML',
  'mizoram': 'MZ',
  'nagaland': 'NL',
  'odisha': 'OD',
  'punjab': 'PB',
  'rajasthan': 'RJ',
  'sikkim': 'SK',
  'tamil nadu': 'TN',
  'telangana': 'TG',
  'tripura': 'TR',
  'uttar pradesh': 'UP',
  'uttarakhand': 'UK',
  'west bengal': 'WB',
  'delhi': 'DL',
};

// Category code mapping
const CATEGORY_CODES: Record<string, string> = {
  SALON: 'SAL',
  GYM: 'GYM',
  HOTEL: 'HTL',
  CLINIC: 'CLN',
  RESTAURANT: 'RST',
  SCHOOL: 'SCH',
  COLLEGE: 'COL',
  RETAIL: 'RTL',
  PHARMACY: 'PHR',
  AUTOMOBILE: 'AUT',
  REAL_ESTATE: 'RLE',
  COACHING: 'CCH',
  OTHER: 'OTH',
};

function getStateCode(state: string): string {
  const code = STATE_CODES[state.toLowerCase().trim()];
  if (code) return code;
  // Fallback: first 2 chars uppercase
  return state.substring(0, 2).toUpperCase();
}

function getLocationCode(name: string, len: number = 3): string {
  // Take first N consonants/chars, uppercase, remove spaces
  const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return clean.substring(0, len).padEnd(len, 'X');
}

function getCategoryCode(category: string): string {
  return CATEGORY_CODES[category] || 'OTH';
}

/**
 * Generate a unique Family ID for a business.
 * Format: KA-SHM-GPL-SAL-00001
 *   STATE-CITY-AREA-CATEGORY-SERIAL
 */
export async function generateFamilyId(params: {
  state: string;
  cityName: string;
  areaName?: string;
  category: string;
}): Promise<string> {
  const stateCode = getStateCode(params.state);
  const cityCode = getLocationCode(params.cityName, 3);
  const areaCode = params.areaName ? getLocationCode(params.areaName, 3) : 'GEN';
  const catCode = getCategoryCode(params.category);

  const prefix = `${stateCode}-${cityCode}-${areaCode}-${catCode}`;

  // Find the highest existing serial for this prefix
  const existing = await prisma.business.findMany({
    where: {
      familyId: { startsWith: prefix },
    },
    select: { familyId: true },
    orderBy: { familyId: 'desc' },
    take: 1,
  });

  let serial = 1;
  if (existing.length > 0 && existing[0].familyId) {
    const parts = existing[0].familyId.split('-');
    const lastSerial = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSerial)) {
      serial = lastSerial + 1;
    }
  }

  const serialStr = String(serial).padStart(5, '0');
  return `${prefix}-${serialStr}`;
}

/**
 * Assign a Family ID to a business if it doesn't have one.
 * Fetches city/area data and generates the ID.
 */
export async function assignFamilyId(businessId: string): Promise<string | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      familyId: true,
      category: true,
      city: { select: { name: true, state: true } },
      area: { select: { name: true } },
    },
  });

  if (!business) return null;
  if (business.familyId) return business.familyId;

  const familyId = await generateFamilyId({
    state: business.city.state,
    cityName: business.city.name,
    areaName: business.area?.name,
    category: business.category,
  });

  await prisma.business.update({
    where: { id: businessId },
    data: { familyId },
  });

  return familyId;
}
