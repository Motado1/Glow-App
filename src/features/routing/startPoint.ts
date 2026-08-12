/**
 * Where a route starts. Pure so it can be unit-tested, and shared by the Today
 * and Route screens so they can never disagree about the starting point.
 */
import type { Farm, GeoPoint } from '@/domain/types';

/** Fallback when we know nothing at all (downtown Denver). */
export const DEFAULT_START: GeoPoint = { lat: 39.74, lng: -104.99 };

export type StartMode =
  | { kind: 'auto' }
  | { kind: 'current'; point: GeoPoint }
  | { kind: 'farm'; farmId: string }
  | { kind: 'manual'; point: GeoPoint; label?: string };

export interface ResolvedStart {
  point: GeoPoint;
  label: string;
}

export interface HomeBase {
  point: GeoPoint;
  label: string;
}

/**
 * @param home The signed-in worker's home base, if it has been geocoded. In
 * `auto` mode this beats "wherever the first farm happens to be" — a route
 * should start where the person starts their day.
 */
export function resolveStart(mode: StartMode, farms: Farm[], home?: HomeBase): ResolvedStart {
  switch (mode.kind) {
    case 'current':
      return { point: mode.point, label: 'My current location' };
    case 'manual':
      return { point: mode.point, label: mode.label ?? 'Custom start' };
    case 'farm': {
      const f = farms.find((x) => x.id === mode.farmId);
      if (f?.location) return { point: f.location, label: f.name };
      // Farm was completed, unassigned, or never had coordinates — fall back.
      return resolveStart({ kind: 'auto' }, farms, home);
    }
    case 'auto':
    default: {
      if (home) return { point: home.point, label: home.label };
      const f = farms.find((x) => x.location);
      return f?.location
        ? { point: f.location, label: `Near ${f.name}` }
        : { point: DEFAULT_START, label: 'Denver, CO (default)' };
    }
  }
}
