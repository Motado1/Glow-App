/**
 * Basic route sequencing (requirements §7). Greedy nearest-neighbour from a
 * start point — O(n²), which is plenty for a few dozen stops. We deliberately
 * do NOT replace Apple/Google Maps; we just order stops and hand off.
 *
 * Farms without coordinates are skipped and surfaced (never silently dropped),
 * and completed farms are excluded so they can't be photographed twice.
 */
import type { Farm, GeoPoint } from '@/domain/types';
import { estDriveMinutes, haversineMiles } from '@/lib/geo';

export interface RouteStop {
  farmId: string;
  glowFarmId: string;
  /** 1-based position in the route. */
  order: number;
  location: GeoPoint;
  /** Distance/time from the previous stop (0 for the first). */
  legMiles: number;
  legMinutes: number;
}

export interface SkippedStop {
  farmId: string;
  glowFarmId: string;
  reason: string;
}

export interface OptimizedRoute {
  start: GeoPoint;
  stops: RouteStop[];
  skipped: SkippedStop[];
  totalMiles: number;
  totalMinutes: number;
}

export function optimizeRoute(
  farms: Farm[],
  start: GeoPoint,
  opts?: { completedFarmIds?: Set<string> },
): OptimizedRoute {
  const completed = opts?.completedFarmIds ?? new Set<string>();
  const skipped: SkippedStop[] = [];
  const pending: { farm: Farm; loc: GeoPoint }[] = [];

  for (const f of farms) {
    if (completed.has(f.id)) continue;
    if (!f.location) {
      skipped.push({ farmId: f.id, glowFarmId: f.glowFarmId, reason: 'Missing coordinates' });
      continue;
    }
    pending.push({ farm: f, loc: f.location });
  }

  const stops: RouteStop[] = [];
  let cursor = start;
  let order = 1;
  let totalMiles = 0;
  let totalMinutes = 0;

  while (pending.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < pending.length; i++) {
      const d = haversineMiles(cursor, pending[i].loc);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = pending.splice(bestIdx, 1);
    const legMinutes = estDriveMinutes(bestDist);
    stops.push({
      farmId: next.farm.id,
      glowFarmId: next.farm.glowFarmId,
      order: order++,
      location: next.loc,
      legMiles: bestDist,
      legMinutes,
    });
    totalMiles += bestDist;
    totalMinutes += legMinutes;
    cursor = next.loc;
  }

  return { start, stops, skipped, totalMiles, totalMinutes };
}

/**
 * Manually move a stop and renumber. Returns a new ordered farmId list.
 * (Distances aren't recomputed here — call optimizeRoute-style rebuild in the
 * caller if exact legs are needed after a manual reorder.)
 */
export function reorderStops(order: string[], from: number, to: number): string[] {
  if (from < 0 || from >= order.length || to < 0 || to >= order.length) return order;
  const copy = [...order];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

/** Split a route into day-sized chunks by a max on-the-clock minutes budget. */
export function splitIntoDays(route: OptimizedRoute, maxMinutesPerDay = 480): RouteStop[][] {
  const days: RouteStop[][] = [];
  let current: RouteStop[] = [];
  let minutes = 0;
  const ON_SITE = 15;
  for (const stop of route.stops) {
    const cost = stop.legMinutes + ON_SITE;
    if (current.length > 0 && minutes + cost > maxMinutesPerDay) {
      days.push(current);
      current = [];
      minutes = 0;
    }
    current.push(stop);
    minutes += cost;
  }
  if (current.length) days.push(current);
  return days;
}
