/**
 * US address helpers for the farm importer.
 *
 * Real exports often carry a single "Address" column and nothing else — one
 * quoted string like `12797 St Ann Christine Ct, Riverton, Utah 84065`. The app
 * still needs a Farm ID (everything hangs off it), a display name, and a state
 * (assignment, progress and route grouping are all per-state), so we derive all
 * three from that string rather than rejecting the file.
 */

/** Full state/territory name → USPS code. */
const STATE_BY_NAME: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
  minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
  'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'puerto rico': 'PR', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX',
  utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};

const STATE_CODES = new Set(Object.values(STATE_BY_NAME));

/** "Utah" / "utah" / "UT" → "UT". Anything else → undefined. */
export function normalizeState(value: string): string | undefined {
  const v = value.trim().replace(/\.$/, '');
  if (!v) return undefined;
  if (v.length === 2 && STATE_CODES.has(v.toUpperCase())) return v.toUpperCase();
  return STATE_BY_NAME[v.toLowerCase().replace(/\s+/g, ' ')];
}

export interface AddressParts {
  /** Street line — the first comma-separated segment. */
  street?: string;
  city?: string;
  /** USPS two-letter code. */
  state?: string;
  zip?: string;
}

const ZIP_RE = /\b(\d{5})(?:-\d{4})?\s*$/;

/**
 * Pull street / city / state / zip out of a one-cell address. Tolerant by
 * design: anything it can't identify is simply left undefined, and the raw
 * address is always kept as-is for display and geocoding.
 */
export function parseAddressParts(address: string): AddressParts {
  let rest = address
    .trim()
    .replace(/[,\s]+(usa|u\.s\.a\.|united states)\s*$/i, '')
    .trim();
  if (!rest) return {};

  const parts: AddressParts = {};

  const zipMatch = rest.match(ZIP_RE);
  if (zipMatch) {
    parts.zip = zipMatch[1];
    rest = rest.slice(0, zipMatch.index).replace(/[,\s]+$/, '');
  }

  // State: the tail of what's left, whether or not a comma separates it
  // ("…, Riverton, Utah" and "… Riverton UT" both appear in real exports).
  const words = rest.split(/\s+/);
  for (const take of [3, 2, 1]) {
    if (words.length <= take) continue;
    const candidate = words.slice(-take).join(' ').replace(/^,\s*/, '');
    const code = normalizeState(candidate);
    if (code) {
      parts.state = code;
      rest = words.slice(0, -take).join(' ').replace(/[,\s]+$/, '');
      break;
    }
  }

  const segments = rest.split(',').map((s) => s.trim()).filter(Boolean);
  if (segments.length > 0) parts.street = segments[0];
  if (segments.length > 1) parts.city = segments[segments.length - 1];
  return parts;
}

/**
 * A display name for a farm whose file gave none: the street line, which is
 * what field crews call the stop anyway.
 */
export function deriveFarmName(address: string): string {
  const { street } = parseAddressParts(address);
  return (street || address).trim();
}

/** FNV-1a — small, dependency-free, and stable across platforms and runs. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * A Farm ID for a file that carries none, derived from the address so it is
 * **stable**: re-importing the same list updates those farms instead of
 * creating a second copy of every one. The `AUTO-` prefix keeps it obvious
 * that this is a placeholder for a real Glow farm ID, not one from the Hub.
 */
export function deriveFarmId(seed: string): string {
  const key = seed.trim().toLowerCase().replace(/\s+/g, ' ');
  return `AUTO-${hash32(key).toString(36).toUpperCase().padStart(7, '0')}`;
}
