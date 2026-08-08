/**
 * Shared farm-import row model and validation.
 *
 * Every source (CSV, XLSX, PDF tables) normalises to `Record<string,string>[]`
 * and then runs through `rowsFromRecords`, so there is exactly one definition
 * of what a valid farm row is.
 *
 * Required: Glow Farm ID + Name + (Address OR coordinates).
 * State is optional — many exports don't carry it.
 */
import { isValidLatLng, parseCoordinates } from '@/lib/geo';

export interface FarmImportRow {
  glowFarmId: string;
  name: string;
  address?: string;
  state?: string;
  region?: string;
  hubRecordId?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  accessInstructions?: string;
  scheduledDate?: string;
}

export interface FarmImportError {
  /** 1-based line in the source file (including the header row). */
  row: number;
  message: string;
}

export interface ParsedFarmImport {
  rows: FarmImportRow[];
  errors: FarmImportError[];
  headers: string[];
  totalRows: number;
}

const FIELD_ALIASES = {
  glowFarmId: ['glow farm id', 'glowfarmid', 'glow id', 'farm id', 'farmid', 'id'],
  name: ['name', 'farm name', 'customer', 'customer name', 'customer/farm name', 'site', 'site name'],
  address: ['address', 'full address', 'street address', 'site address', 'location address'],
  state: ['state', 'st'],
  region: ['region', 'territory'],
  hubRecordId: ['hub id', 'hub record id', 'hubrecordid', 'hub'],
  lat: ['lat', 'latitude'],
  lng: ['lng', 'lon', 'long', 'longitude'],
  coordinates: ['coordinates', 'coordinate', 'coords', 'lat/lng', 'latlng', 'lat lng', 'lat,lng', 'gps', 'gps coordinates'],
  notes: ['notes', 'note', 'comments'],
  accessInstructions: ['access', 'access instructions', 'gate code'],
  scheduledDate: ['scheduled', 'scheduled date', 'date'],
} as const;

type HeaderField = keyof typeof FIELD_ALIASES;

export const RECOGNISED_COLUMNS =
  'Glow Farm ID, Name, Address, Coordinates (or Lat + Lng), State, Region, Hub ID, Notes, Access, Scheduled';

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_\s]+/g, ' ');
}

export function buildHeaderMap(headers: string[]): Partial<Record<HeaderField, string>> {
  const map: Partial<Record<HeaderField, string>> = {};
  for (const raw of headers) {
    const norm = normalizeHeader(raw);
    for (const field of Object.keys(FIELD_ALIASES) as HeaderField[]) {
      if (map[field]) continue;
      if ((FIELD_ALIASES[field] as readonly string[]).includes(norm)) map[field] = raw;
    }
  }
  return map;
}

/**
 * Validate normalised records into farm rows.
 * @param firstDataLine the file line number of the first record (2 when there's a header row).
 */
export function rowsFromRecords(
  records: Record<string, string>[],
  headers: string[],
  firstDataLine = 2,
): ParsedFarmImport {
  const headerMap = buildHeaderMap(headers);
  const rows: FarmImportRow[] = [];
  const errors: FarmImportError[] = [];

  const hasLocationColumn = !!(headerMap.address || headerMap.coordinates || (headerMap.lat && headerMap.lng));
  const missingHeaders: string[] = [];
  if (!headerMap.glowFarmId) missingHeaders.push('Farm ID');
  if (!headerMap.name) missingHeaders.push('Name');
  if (!hasLocationColumn) missingHeaders.push('Address or Coordinates');
  if (missingHeaders.length > 0) {
    errors.push({ row: 1, message: `Missing ${missingHeaders.length === 1 ? 'a required column' : 'required columns'}: ${missingHeaders.join(', ')}` });
    return { rows, errors, headers, totalRows: records.length };
  }

  records.forEach((raw, i) => {
    const lineNo = i + firstDataLine;
    const get = (f: HeaderField): string => {
      const h = headerMap[f];
      return h ? (raw[h] ?? '').trim() : '';
    };

    const glowFarmId = get('glowFarmId');
    const name = get('name');
    const address = get('address');

    // --- coordinates: a combined "lat, lng" cell, or separate columns ---
    let lat: number | undefined;
    let lng: number | undefined;
    const combined = get('coordinates');
    if (combined) {
      const p = parseCoordinates(combined);
      if (!p) {
        errors.push({ row: lineNo, message: `Invalid coordinates: "${combined}"` });
        return;
      }
      lat = p.lat;
      lng = p.lng;
    } else {
      const latStr = get('lat');
      const lngStr = get('lng');
      // A combined value pasted into the lat column is common — accept it.
      const pastedPair = latStr && !lngStr ? parseCoordinates(latStr) : null;
      if (pastedPair) {
        lat = pastedPair.lat;
        lng = pastedPair.lng;
      } else if (latStr || lngStr) {
        if (!latStr || !lngStr) {
          errors.push({ row: lineNo, message: 'Latitude and longitude must both be provided' });
          return;
        }
        const la = Number(latStr);
        const ln = Number(lngStr);
        if (!isValidLatLng(la, ln)) {
          errors.push({ row: lineNo, message: `Invalid latitude/longitude: "${latStr}, ${lngStr}"` });
          return;
        }
        lat = la;
        lng = ln;
      }
    }

    const hasCoords = lat !== undefined && lng !== undefined;
    const missing: string[] = [];
    if (!glowFarmId) missing.push('Farm ID');
    if (!name) missing.push('Name');
    if (!address && !hasCoords) missing.push('Address or Coordinates');
    if (missing.length > 0) {
      errors.push({ row: lineNo, message: `Missing: ${missing.join(', ')}` });
      return;
    }

    rows.push({
      glowFarmId,
      name,
      address: address || undefined,
      state: get('state') || undefined,
      region: get('region') || undefined,
      hubRecordId: get('hubRecordId') || undefined,
      lat,
      lng,
      notes: get('notes') || undefined,
      accessInstructions: get('accessInstructions') || undefined,
      scheduledDate: get('scheduledDate') || undefined,
    });
  });

  return { rows, errors, headers, totalRows: records.length };
}
