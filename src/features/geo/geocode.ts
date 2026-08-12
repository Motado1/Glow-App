/**
 * Address → coordinates via OpenStreetMap Nominatim.
 *
 * Free and keyless, but the usage policy caps us at ~1 request/second, so every
 * lookup goes through a serialized queue and results are cached (including
 * misses) so the same address is never fetched twice. Plain `fetch`, so this
 * behaves identically on web and native — unlike expo-location's geocoder,
 * which throws on web.
 *
 * The cache is **persisted**. At 1.1s per address a 500-farm list takes about
 * nine minutes, and an in-memory cache meant closing the app threw all of that
 * away and started from zero. Now a re-run skips everything already resolved,
 * so an interrupted import resumes instead of restarting.
 */
import { KEYS, readJson, writeJson } from '@/data/local/storage';
import type { GeoPoint } from '@/domain/types';
import { isValidLatLng } from '@/lib/geo';

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL_MS = 1100;

const cache = new Map<string, GeoPoint | null>();
let lastRequestAt = 0;
let hydrated = false;
/** Batches disk writes — one per lookup would be a write per second forever. */
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function hydrateCache(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const stored = await readJson<Record<string, GeoPoint | null>>(KEYS.geocodeCache, {});
  for (const [k, v] of Object.entries(stored)) {
    // Anything resolved in this session is fresher than what's on disk.
    if (!cache.has(k)) cache.set(k, v);
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void writeJson(KEYS.geocodeCache, Object.fromEntries(cache)).catch(() => {});
  }, 2000);
}
/** Serializes lookups so the rate limit holds even under concurrent callers. */
let queue: Promise<unknown> = Promise.resolve();

function normalize(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function waitForSlot(): Promise<void> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

/** Returns null when the address can't be found (never throws). */
export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const key = normalize(query);
  if (!key) return null;
  await hydrateCache();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const run = queue.then(async (): Promise<GeoPoint | null> => {
    const already = cache.get(key);
    if (already !== undefined) return already;
    await waitForSlot();
    try {
      const url = `${ENDPOINT}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
      // Browsers forbid setting User-Agent (it's dropped); native gets a proper
      // identifier as Nominatim's policy asks.
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (typeof document === 'undefined') headers['User-Agent'] = 'GlowFieldOps/0.1';

      const res = await fetch(url, { headers });
      if (!res.ok) {
        cache.set(key, null);
        return null;
      }
      const json = (await res.json()) as { lat?: string; lon?: string }[];
      const hit = Array.isArray(json) ? json[0] : undefined;
      const lat = Number(hit?.lat);
      const lng = Number(hit?.lon);
      const point = hit && isValidLatLng(lat, lng) ? { lat, lng } : null;
      cache.set(key, point);
      scheduleFlush();
      return point;
    } catch {
      cache.set(key, null);
      scheduleFlush();
      return null;
    }
  });

  queue = run.catch(() => undefined);
  return run;
}

/** How many of these addresses are already resolved, for progress reporting. */
export async function countCached(queries: string[]): Promise<number> {
  await hydrateCache();
  return queries.filter((q) => cache.has(normalize(q))).length;
}

/** Test/demo helper. */
export function clearGeocodeCache(): void {
  cache.clear();
  lastRequestAt = 0;
  hydrated = false;
  void writeJson(KEYS.geocodeCache, {}).catch(() => {});
}
