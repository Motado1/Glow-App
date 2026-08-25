/**
 * CSV farm import. Parses to normalised records, then hands off to the shared
 * validator in `rows.ts` so CSV/XLSX/PDF all agree on what a valid row is.
 */
import Papa from 'papaparse';
import { rowsFromRecords, type ParsedFarmImport } from './rows';

export type { FarmImportRow, FarmImportError, ParsedFarmImport } from './rows';
export { RECOGNISED_COLUMNS } from './rows';

export function parseFarmCsv(text: string): ParsedFarmImport {
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const headers = res.meta.fields ?? [];
  const parsed = rowsFromRecords(res.data ?? [], headers);

  // Surface Papa's own problems (malformed quoting etc.) — previously swallowed.
  // Except one: a file with a single column has no delimiter to detect, which
  // Papa reports as an error even though it parsed the file correctly. An
  // address-only export is exactly that file, so reporting it would put a red
  // "skipped row" on a perfectly good import.
  for (const e of res.errors ?? []) {
    if (e.code === 'UndetectableDelimiter') continue;
    parsed.errors.push({
      row: typeof e.row === 'number' ? e.row + 2 : 1,
      message: e.message ?? 'Malformed CSV',
    });
  }
  return parsed;
}
