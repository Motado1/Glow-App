/**
 * Shared farm-import row model and validation.
 *
 * Every source (CSV, XLSX, PDF tables) normalises to `Record<string,string>[]`
 * and then runs through `rowsFromRecords`, so there is exactly one definition
 * of what a valid farm row is.
 *
 * Required: a location — an Address OR coordinates.
 * Glow Farm ID and Name are required only when the file has those columns; a
 * bare address list (the common Hub/region export) gets both derived from the
 * address instead of being rejected. State is optional and inferred from the
 * address when it isn't its own column.
 */
import { deriveFarmId, deriveFarmName, normalizeState, parseAddressParts } from './address';
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
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  /** True when the Farm ID was derived from the address, not read from the file. */
  idGenerated?: boolean;
  /** True when the name was derived from the address. */
  nameGenerated?: boolean;
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
  /** Farm IDs appearing more than once in this file. */
  duplicateIds: string[];
  /** The file had no Farm ID column, so IDs were derived from the address. */
  generatedIds: boolean;
  /** The file had no Name column, so names were derived from the address. */
  generatedNames: boolean;
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
  contactName: ['contact', 'contact name', 'owner', 'owner name', 'landowner', 'primary contact'],
  contactPhone: ['phone', 'contact phone', 'owner phone', 'telephone', 'mobile', 'cell'],
  contactEmail: ['email', 'contact email', 'owner email'],
} as const;

type HeaderField = keyof typeof FIELD_ALIASES;

export const RECOGNISED_COLUMNS =
  'Address (or Coordinates / Lat + Lng), Glow Farm ID, Name, State, Region, Hub ID, Notes, Access, Scheduled, Contact, Phone, Email';

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
  // Only a location is structurally required. A file with no Farm ID / Name
  // column gets both derived per row; a file that *has* those columns but
  // leaves a cell blank is still an error, because a half-filled ID column
  // means the export is wrong, not minimal.
  const hasIdColumn = !!headerMap.glowFarmId;
  const hasNameColumn = !!headerMap.name;
  if (!hasLocationColumn) {
    errors.push({ row: 1, message: 'Missing a required column: Address or Coordinates' });
    return {
      rows, errors, headers, totalRows: records.length, duplicateIds: [],
      generatedIds: false, generatedNames: false,
    };
  }

  records.forEach((raw, i) => {
    const lineNo = i + firstDataLine;
    const get = (f: HeaderField): string => {
      const h = headerMap[f];
      return h ? (raw[h] ?? '').trim() : '';
    };

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
    // The seed for anything derived: the address when there is one, else the
    // pin — so the same file always yields the same Farm ID.
    const seed = address || (hasCoords ? `${lat},${lng}` : '');
    const glowFarmId = hasIdColumn ? get('glowFarmId') : deriveFarmId(seed);
    const name = hasNameColumn
      ? get('name')
      : (address ? deriveFarmName(address) : seed);

    const missing: string[] = [];
    if (hasIdColumn && !glowFarmId) missing.push('Farm ID');
    if (hasNameColumn && !name) missing.push('Name');
    if (!address && !hasCoords) missing.push('Address or Coordinates');
    if (missing.length > 0) {
      errors.push({ row: lineNo, message: `Missing: ${missing.join(', ')}` });
      return;
    }

    // State drives assignment, progress and route grouping, so take it from the
    // address when the file has no column of its own. Full names become USPS
    // codes ("Utah" → "UT"); an unrecognised value is kept verbatim.
    const stateCell = get('state');
    const addressParts = address ? parseAddressParts(address) : {};
    const state = stateCell
      ? normalizeState(stateCell) ?? stateCell
      : addressParts.state;

    rows.push({
      glowFarmId,
      name,
      idGenerated: !hasIdColumn || undefined,
      nameGenerated: !hasNameColumn || undefined,
      address: address || undefined,
      state: state || undefined,
      region: get('region') || undefined,
      hubRecordId: get('hubRecordId') || undefined,
      lat,
      lng,
      notes: get('notes') || undefined,
      accessInstructions: get('accessInstructions') || undefined,
      scheduledDate: get('scheduledDate') || undefined,
      contactName: get('contactName') || undefined,
      contactPhone: get('contactPhone') || undefined,
      contactEmail: get('contactEmail') || undefined,
    });
  });

  // Duplicate Farm IDs inside one file were silently accepted. They collide on
  // upsert (last row wins) and, worse, the geocode backfill matches rows by
  // Farm ID — so a duplicate could write one farm's coordinates onto another.
  const seen = new Map<string, number>();
  const duplicated = new Set<string>();
  rows.forEach((r) => {
    const key = r.glowFarmId.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if ((seen.get(key) ?? 0) > 1) duplicated.add(r.glowFarmId);
  });
  const duplicateIds = [...duplicated];

  return {
    rows,
    errors,
    headers,
    totalRows: records.length,
    duplicateIds,
    generatedIds: !hasIdColumn,
    generatedNames: !hasNameColumn,
  };
}
