/**
 * Address → coordinates via OpenStreetMap Nominatim.
 *
 * Free and keyless, but the usage policy caps us at ~1 request/second, so every
 * lookup goes through a serialized queue and results are cached (including
 * misses) so the same address is never fetched twice. Plain `fetch`, so this
 * behaves identically on web and native — unlike expo-location's geocoder,
 * which throws on web.
 */
import type { GeoPoint } from '@/domain/types';
import { isValidLatLng } from '@/lib/geo';

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL_MS = 1100;

const cache = new Map<string, GeoPoint | null>();
let lastRequestAt = 0;
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
      return point;
    } catch {
      cache.set(key, null);
      return null;
    }
  });

  queue = run.catch(() => undefined);
  return run;
}

/** Test/demo helper. */
export function clearGeocodeCache(): void {
  cache.clear();
  lastRequestAt = 0;
}
