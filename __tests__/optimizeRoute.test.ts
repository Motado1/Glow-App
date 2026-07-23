import type { Farm } from '@/domain/types';
import { optimizeRoute, reorderStops, splitIntoDays } from '@/features/routing/optimizeRoute';

function farm(id: string, lat?: number, lng?: number): Farm {
  return {
    id,
    glowFarmId: `GF-${id}`,
    name: id,
    address: id,
    location: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    state: 'CO',
    overallStatus: 'pre_install_needed',
    preInstallStatus: 'assigned',
    ptoStatus: 'not_reached',
    createdAt: '',
    updatedAt: '',
  };
}

describe('optimizeRoute', () => {
  it('orders by nearest-neighbour from the start', () => {
    const start = { lat: 0, lng: 0 };
    const farms = [farm('far', 0, 3), farm('mid', 0, 2), farm('near', 0, 1)];
    const r = optimizeRoute(farms, start);
    expect(r.stops.map((s) => s.farmId)).toEqual(['near', 'mid', 'far']);
    expect(r.stops[0].order).toBe(1);
    expect(r.totalMiles).toBeGreaterThan(0);
  });

  it('skips farms without coordinates instead of dropping them silently', () => {
    const r = optimizeRoute([farm('a', 1, 1), farm('nocoord')], { lat: 0, lng: 0 });
    expect(r.stops).toHaveLength(1);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].farmId).toBe('nocoord');
  });

  it('excludes completed farms', () => {
    const r = optimizeRoute([farm('a', 1, 1), farm('b', 2, 2)], { lat: 0, lng: 0 }, { completedFarmIds: new Set(['a']) });
    expect(r.stops.map((s) => s.farmId)).toEqual(['b']);
  });

  it('reorders stops', () => {
    expect(reorderStops(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('splits into day-sized chunks', () => {
    const start = { lat: 0, lng: 0 };
    const farms = Array.from({ length: 6 }, (_, i) => farm(`f${i}`, 0, i + 1));
    const route = optimizeRoute(farms, start);
    const days = splitIntoDays(route, 30);
    expect(days.length).toBeGreaterThan(1);
    expect(days.flat()).toHaveLength(6);
  });
});
