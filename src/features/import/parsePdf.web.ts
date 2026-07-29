/**
 * PDF table import (web).
 *
 * pdfjs is loaded at RUNTIME rather than bundled: its source contains
 * `import(this.workerSrc)`, a dynamic import with a non-static argument, which
 * Metro rejects at transform time. Loading it as an ES module from a CDN is
 * pdfjs's own supported path for this situation and keeps parsing on a worker.
 *
 * pdfjs gives us text fragments with x/y positions, not a table, so we rebuild
 * the table geometrically: cluster fragments into rows by y, derive columns
 * from the header row's x positions, then assign each fragment to a column.
 * Best-effort by nature — the import screen always previews rows before writing.
 */
import { rowsFromRecords, type ParsedFarmImport } from './rows';

export const PDF_SUPPORTED = true;

const PDFJS_VERSION = '4.10.38';
const CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build`;

interface PdfTextItem {
  str?: string;
  transform?: number[];
}
interface PdfLib {
  getDocument(src: { data: ArrayBuffer; isEvalSupported?: boolean }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{ getTextContent(): Promise<{ items: PdfTextItem[] }> }>;
    }>;
  };
}

let loader: Promise<PdfLib> | null = null;

function loadPdfjs(): Promise<PdfLib> {
  if (loader) return loader;
  loader = new Promise<PdfLib>((resolve, reject) => {
    const existing = (globalThis as Record<string, unknown>).__pdfjsLib as PdfLib | undefined;
    if (existing) return resolve(existing);

    const script = document.createElement('script');
    script.type = 'module';
    // Inline module: the import specifiers are runtime strings, never seen by Metro.
    script.textContent = `
      import * as pdfjs from '${CDN}/pdf.min.mjs';
      pdfjs.GlobalWorkerOptions.workerSrc = '${CDN}/pdf.worker.min.mjs';
      globalThis.__pdfjsLib = pdfjs;
      window.dispatchEvent(new Event('glow-pdfjs-ready'));
    `;
    const timeout = setTimeout(() => reject(new Error('timeout')), 20000);
    window.addEventListener(
      'glow-pdfjs-ready',
      () => {
        clearTimeout(timeout);
        const lib = (globalThis as Record<string, unknown>).__pdfjsLib as PdfLib | undefined;
        lib ? resolve(lib) : reject(new Error('failed to load'));
      },
      { once: true },
    );
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('failed to load'));
    };
    document.head.appendChild(script);
  }).catch((e) => {
    loader = null; // allow a retry
    throw e;
  });
  return loader;
}

interface Frag {
  text: string;
  x: number;
  y: number;
}

/** Group fragments into visual lines, tolerating small baseline jitter. */
function toLines(frags: Frag[], tolerance = 3): Frag[][] {
  const sorted = [...frags].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Frag[][] = [];
  for (const f of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].y - f.y) <= tolerance) line.push(f);
    else lines.push([f]);
  }
  for (const l of lines) l.sort((a, b) => a.x - b.x);
  return lines;
}

/** Assign a fragment to the nearest column start at or before its x. */
function columnIndex(bounds: number[], x: number): number {
  let idx = 0;
  for (let i = 0; i < bounds.length; i++) {
    if (x >= bounds[i] - 4) idx = i;
  }
  return idx;
}

function fail(message: string): ParsedFarmImport {
  return { rows: [], errors: [{ row: 1, message }], headers: [], totalRows: 0 };
}

export async function parseFarmPdf(data: ArrayBuffer): Promise<ParsedFarmImport> {
  let pdfjs: PdfLib;
  try {
    pdfjs = await loadPdfjs();
  } catch {
    return fail('Could not load the PDF reader. Check your internet connection and try again, or use a CSV.');
  }

  let frags: Frag[] = [];
  try {
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      for (const item of content.items) {
        const text = (item.str ?? '').trim();
        if (!text || !item.transform) continue;
        // Offset y per page so page 2 sorts below page 1.
        frags.push({ text, x: item.transform[4], y: item.transform[5] - p * 100000 });
      }
    }
  } catch (e) {
    return fail(e instanceof Error ? `Could not read the PDF: ${e.message}` : 'Could not read the PDF.');
  }

  const lines = toLines(frags);
  const headerIdx = lines.findIndex((l) => l.length >= 2);
  if (headerIdx < 0 || lines.length < headerIdx + 2) {
    return fail('No table rows found in this PDF. Export it as a CSV instead.');
  }

  const headerLine = lines[headerIdx];
  const headers = headerLine.map((f) => f.text);
  const bounds = headerLine.map((f) => f.x);

  const records: Record<string, string>[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    // Skip headers repeated on later pages.
    if (line.map((f) => f.text).join('|') === headers.join('|')) continue;
    const cells: string[] = new Array(headers.length).fill('');
    for (const f of line) {
      const c = columnIndex(bounds, f.x);
      cells[c] = cells[c] ? `${cells[c]} ${f.text}` : f.text;
    }
    if (cells.every((c) => !c)) continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = cells[idx] ?? '';
    });
    records.push(rec);
  }

  return rowsFromRecords(records, headers, 2);
}
