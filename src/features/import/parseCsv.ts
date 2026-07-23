/**
 * CSV farm import (requirements §17.2). Tolerant header matching so a variety
 * of spreadsheet exports map onto the farm record. Produces validated rows +
 * per-row errors for a preview before anything is written.
 */
import Papa from 'papaparse';

export interface FarmImportRow {
  glowFarmId: string;
  name: string;
  address: string;
  state: string;
  region?: string;
  hubRecordId?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  accessInstructions?: string;
  scheduledDate?: string;
}

export interface FarmImportError {
  row: number; // 1-based line in the file (incl. header)
  message: string;
}

export interface ParsedFarmImport {
  rows: FarmImportRow[];
  errors: FarmImportError[];
  headers: string[];
  totalRows: number;
}

type Field = keyof FarmImportRow;

const FIELD_ALIASES: Record<Field, string[]> = {
  glowFarmId: ['glow farm id', 'glowfarmid', 'glow id', 'farm id', 'id'],
  name: ['name', 'farm name', 'customer', 'customer name', 'customer/farm name'],
  address: ['address', 'full address', 'street address'],
  state: ['state'],
  region: ['region', 'territory'],
  hubRecordId: ['hub id', 'hub record id', 'hubrecordid', 'hub'],
  lat: ['lat', 'latitude'],
  lng: ['lng', 'lon', 'long', 'longitude'],
  notes: ['notes', 'note'],
  accessInstructions: ['access', 'access instructions'],
  scheduledDate: ['scheduled', 'scheduled date', 'date'],
};

const REQUIRED: Field[] = ['glowFarmId', 'name', 'address', 'state'];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_\s]+/g, ' ');
}

function buildHeaderMap(headers: string[]): Partial<Record<Field, string>> {
  const map: Partial<Record<Field, string>> = {};
  for (const rawHeader of headers) {
    const norm = normalizeHeader(rawHeader);
    for (const field of Object.keys(FIELD_ALIASES) as Field[]) {
      if (map[field]) continue;
      if (FIELD_ALIASES[field].includes(norm)) {
        map[field] = rawHeader;
      }
    }
  }
  return map;
}

export function parseFarmCsv(text: string): ParsedFarmImport {
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const headers = res.meta.fields ?? [];
  const headerMap = buildHeaderMap(headers);
  const rows: FarmImportRow[] = [];
  const errors: FarmImportError[] = [];

  const missingHeaders = REQUIRED.filter((f) => !headerMap[f]);
  if (missingHeaders.length > 0) {
    errors.push({
      row: 1,
      message: `Missing required column(s): ${missingHeaders.join(', ')}`,
    });
    return { rows, errors, headers, totalRows: res.data.length };
  }

  res.data.forEach((raw, i) => {
    const lineNo = i + 2; // +1 header, +1 for 1-based
    const get = (f: Field): string => {
      const h = headerMap[f];
      return h ? (raw[h] ?? '').trim() : '';
    };
    const glowFarmId = get('glowFarmId');
    const name = get('name');
    const address = get('address');
    const state = get('state');

    const missing = REQUIRED.filter((f) => !get(f));
    if (missing.length > 0) {
      errors.push({ row: lineNo, message: `Missing: ${missing.join(', ')}` });
      return;
    }

    const latStr = get('lat');
    const lngStr = get('lng');
    const lat = latStr ? Number(latStr) : undefined;
    const lng = lngStr ? Number(lngStr) : undefined;
    if ((latStr && Number.isNaN(lat)) || (lngStr && Number.isNaN(lng))) {
      errors.push({ row: lineNo, message: 'Invalid latitude/longitude' });
      return;
    }

    rows.push({
      glowFarmId,
      name,
      address,
      state,
      region: get('region') || undefined,
      hubRecordId: get('hubRecordId') || undefined,
      lat: lat !== undefined && !Number.isNaN(lat) ? lat : undefined,
      lng: lng !== undefined && !Number.isNaN(lng) ? lng : undefined,
      notes: get('notes') || undefined,
      accessInstructions: get('accessInstructions') || undefined,
      scheduledDate: get('scheduledDate') || undefined,
    });
  });

  return { rows, errors, headers, totalRows: res.data.length };
}
