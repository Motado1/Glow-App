/**
 * PDF table import — native/stub implementation.
 *
 * PDF text extraction relies on `pdfjs-dist`, which needs a browser-like
 * runtime. Import is an admin task done on the desktop build, so PDF support is
 * deliberately web-only; Metro picks `parsePdf.web.ts` there. On phones this
 * stub reports that clearly instead of failing in a confusing way.
 */
import type { ParsedFarmImport } from './rows';

export const PDF_SUPPORTED = false;

export async function parseFarmPdf(_data: ArrayBuffer): Promise<ParsedFarmImport> {
  return {
    rows: [],
    errors: [{ row: 1, message: 'PDF import is available in the desktop (web) app.' }],
    headers: [],
    totalRows: 0,
    duplicateIds: [],
  };
}
