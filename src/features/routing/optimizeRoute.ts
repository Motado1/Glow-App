/**
 * Route sequencing (requirements §7).
 *
 * Three phases: a greedy nearest-neighbour seed, then local-search improvement,
 * then a rebuild of the leg distances. The rebuild matters — improvement passes
 * reorder the stops, which invalidates any leg/total computed during seeding.
 *
 * Improvement uses 2-opt (removes crossings) AND Or-opt (relocates a single
 * stop). Both are needed: 2-opt provably cannot fix the most common real-world
 * case, a farm stranded "behind" the start point, because no segment reversal
 * produces that move.
 *
 * Distances are straight-line (haversine), not road distances. We don't replace
 * Apple/Google Maps — we order the stops and hand off.
 */
import type { Farm, GeoPoint } from '@/domain/types';
import { estDriveMinutes, haversineMiles } from '@/lib/geo';

export interface RouteStop {
  farmId: string;
  glowFarmId: string;
  /** 1-based position in the route. */
  order: number;
  location: GeoPoint;
  /** Distance/time from the previous stop (from the start for the first). */
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

export interface OptimizeOptions {
  completedFarmIds?: Set<string>;
  /** Run 2-opt/Or-opt improvement. Default true; false gives the raw seed. */
  improve?: boolean;
  maxPasses?: number;
}

interface Waypoint {
  farmId: string;
  glowFarmId: string;
  loc: GeoPoint;
}

/** Total straight-line miles for an open path: start → p[0] → … → p[n-1]. */
export function routeDistanceMiles(start: GeoPoint, points: GeoPoint[]): number {
  let total = 0;
  let prev = start;
  for (const p of points) {
    total += haversineMiles(prev, p);
    prev = p;
  }
  return total;
}

/** Node at index i, or the fixed start when i < 0. */
function at(order: Waypoint[], i: number, start: GeoPoint): GeoPoint {
  return i < 0 ? start : order[i].loc;
}

/**
 * 2-opt for an OPEN path with a fixed start: reverse order[i..j].
 * Only the two boundary edges change (interior edges are symmetric), and when
 * j is the last index there is no trailing edge — that suffix case is what
 * makes this different from the classic closed-tour formula.
 */
function twoOptPass(order: Waypoint[], start: GeoPoint): boolean {
  const n = order.length;
  const EPS = 1e-9;
  let improved = false;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = at(order, i - 1, start);
      const bi = order[i].loc;
      const bj = order[j].loc;
      const hasTail = j + 1 < n;
      const c = hasTail ? order[j + 1].loc : undefined;
      const before = haversineMiles(a, bi) + (c ? haversineMiles(bj, c) : 0);
      const after = haversineMiles(a, bj) + (c ? haversineMiles(bi, c) : 0);
      if (after < before - EPS) {
        for (let l = i, r = j; l < r; l++, r--) {
          const t = order[l];
          order[l] = order[r];
          order[r] = t;
        }
        improved = true;
      }
    }
  }
  return improved;
}

/**
 * Or-opt: lift a single stop out and reinsert it elsewhere. Fixes the
 * "stranded behind the start" pattern that 2-opt structurally cannot.
 */
function orOptPass(order: Waypoint[], start: GeoPoint): boolean {
  const n = order.length;
  const EPS = 1e-9;
  let improved = false;
  for (let i = 0; i < n; i++) {
    const prev = at(order, i - 1, start);
    const node = order[i].loc;
    const next = i + 1 < n ? order[i + 1].loc : undefined;
    // Cost saved by removing node from its current slot.
    const removed =
      haversineMiles(prev, node) +
      (next ? haversineMiles(node, next) : 0) -
      (next ? haversineMiles(prev, next) : 0);
    if (removed <= EPS) continue;

    let bestGain = EPS;
    let bestPos = -1;
    for (let j = 0; j <= n; j++) {
      if (j === i || j === i + 1) continue; // same slot
      const left = at(order, j - 1, start);
      const right = j < n ? order[j].loc : undefined;
      const added =
        haversineMiles(left, node) +
        (right ? haversineMiles(node, right) : 0) -
        (left && right ? haversineMiles(left, right) : 0);
      const gain = removed - added;
      if (gain > bestGain) {
        bestGain = gain;
        bestPos = j;
      }
    }
    if (bestPos >= 0) {
      const [moved] = order.splice(i, 1);
      order.splice(bestPos > i ? bestPos - 1 : bestPos, 0, moved);
      improved = true;
    }
  }
  return improved;
}

/** Alternate 2-opt and Or-opt until neither improves (or the cap is hit). */
export function improveOrder(order: Waypoint[], start: GeoPoint, maxPasses = 25): number {
  const n = order.length;
  if (n < 3 || n > 400) return 0;
  let passes = 0;
  for (; passes < maxPasses; passes++) {
    const a = twoOptPass(order, start);
    const b = orOptPass(order, start);
    if (!a && !b) break;
  }
  return passes;
}

export function optimizeRoute(
  farms: Farm[],
  start: GeoPoint,
  opts?: OptimizeOptions,
): OptimizedRoute {
  const completed = opts?.completedFarmIds ?? new Set<string>();
  const improve = opts?.improve ?? true;
  const skipped: SkippedStop[] = [];
  const pending: Waypoint[] = [];

  for (const f of farms) {
    if (completed.has(f.id)) continue;
    if (!f.location) {
      skipped.push({ farmId: f.id, glowFarmId: f.glowFarmId, reason: 'Missing coordinates' });
      continue;
    }
    pending.push({ farmId: f.id, glowFarmId: f.glowFarmId, loc: f.location });
  }

  // --- Phase 1: nearest-neighbour seed ---
  const order: Waypoint[] = [];
  let cursor = start;
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
    order.push(next);
    cursor = next.loc;
  }

  // --- Phase 2: local-search improvement ---
  if (improve) improveOrder(order, start, opts?.maxPasses);

  // --- Phase 3: rebuild legs from the FINAL order ---
  const stops: RouteStop[] = [];
  let totalMiles = 0;
  let totalMinutes = 0;
  let prev = start;
  order.forEach((w, i) => {
    const legMiles = haversineMiles(prev, w.loc);
    const legMinutes = estDriveMinutes(legMiles);
    stops.push({
      farmId: w.farmId,
      glowFarmId: w.glowFarmId,
      order: i + 1,
      location: w.loc,
      legMiles,
      legMinutes,
    });
    totalMiles += legMiles;
    totalMinutes += legMinutes;
    prev = w.loc;
  });

  return { start, stops, skipped, totalMiles, totalMinutes };
}

/**
 * Manually move a stop and renumber. Returns a new ordered farmId list.
 * (Leg distances aren't recomputed here — rebuild via optimizeRoute if exact
 * legs are needed after a manual reorder.)
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
