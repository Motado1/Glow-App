import type { Farm } from '@/domain/types';
import { optimizeRoute, routeDistanceMiles } from '@/features/routing/optimizeRoute';

function farm(id: string, lat: number, lng: number): Farm {
  return {
    id,
    glowFarmId: `GF-${id}`,
    name: id,
    address: id,
    location: { lat, lng },
    state: 'CO',
    overallStatus: 'pre_install_needed',
    preInstallStatus: 'assigned',
    ptoStatus: 'not_reached',
    createdAt: '',
    updatedAt: '',
  };
}

/** Deterministic PRNG so this test never flakes. */
function rand(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('route improvement (2-opt + Or-opt)', () => {
  const start = { lat: 39.7, lng: -105.0 };

  it('is never worse than the nearest-neighbour seed, and often better', () => {
    const rng = rand(42);
    let strictlyBetter = 0;
    for (let t = 0; t < 25; t++) {
      const farms = Array.from({ length: 12 }, (_, i) =>
        farm(`f${i}`, 39 + rng() * 2, -106 + rng() * 2),
      );
      const seed = optimizeRoute(farms, start, { improve: false });
      const opt = optimizeRoute(farms, start);
      expect(opt.totalMiles).toBeLessThanOrEqual(seed.totalMiles + 1e-9);
      if (opt.totalMiles < seed.totalMiles - 1e-9) strictlyBetter++;
    }
    // Proves the improvement step actually fires, not just no-ops.
    expect(strictlyBetter).toBeGreaterThan(0);
  });

  it('fixes a stop stranded behind the start (Or-opt, which 2-opt cannot do)', () => {
    // start at 0; stops ahead at +1,+2,+3 and one behind at -2.
    const farms = [farm('a', 39.7, -105.0 + 1), farm('b', 39.7, -105.0 + 2), farm('c', 39.7, -105.0 + 3), farm('behind', 39.7, -105.0 - 2)];
    const seed = optimizeRoute(farms, start, { improve: false });
    const opt = optimizeRoute(farms, start);
    expect(opt.totalMiles).toBeLessThan(seed.totalMiles);
    // Best open path visits the behind-stop first.
    expect(opt.stops[0].farmId).toBe('behind');
  });

  it('rebuilds leg distances to match the final order', () => {
    const rng = rand(7);
    const farms = Array.from({ length: 9 }, (_, i) => farm(`f${i}`, 39 + rng() * 2, -106 + rng() * 2));
    const r = optimizeRoute(farms, start);
    expect(r.totalMiles).toBeCloseTo(routeDistanceMiles(start, r.stops.map((s) => s.location)), 6);
    expect(r.stops.map((s) => s.order)).toEqual(r.stops.map((_, i) => i + 1));
  });
});
