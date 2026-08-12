import { useEffect, useRef, useState } from 'react';
import { repo } from '@/data';
import type { Farm, PhotoPhase } from '@/domain/types';
import { getCurrentPoint } from '@/features/routing/currentLocation';
import { nowIso } from '@/lib/date';
import { classifyCheckIn, type CheckInResult } from './classify';

export interface ActiveCheckIn extends CheckInResult {
  /** Device position at check-in, carried onto every photo taken this session. */
  point?: { lat: number; lng: number };
  accuracyMeters?: number;
}

/**
 * Take one location reading when a farm's checklist opens, record it, and hand
 * the result back so photos taken in this session can be stamped with it.
 *
 * Fires once per farm per mount. Deliberately silent and non-blocking: the
 * screen renders immediately and the result appears when it arrives, because a
 * photographer standing in a field should never wait on a satellite.
 */
export function useCheckIn(farm: Farm | undefined, userId: string | undefined, phase: PhotoPhase) {
  const [result, setResult] = useState<ActiveCheckIn | null>(null);
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!farm || !userId) return;
    // Guard against StrictMode double-invoke and re-renders, which would
    // otherwise write a duplicate arrival for a single visit.
    if (done.current === farm.id) return;
    done.current = farm.id;

    let alive = true;
    (async () => {
      const fix = await getCurrentPoint(true);
      const point = fix.ok ? fix.point : undefined;
      const accuracyMeters = fix.ok ? fix.accuracyMeters : undefined;
      const verdict = classifyCheckIn({ point, accuracyMeters, farmLocation: farm.location });

      if (alive) setResult({ ...verdict, point, accuracyMeters });

      // Record even the failures — "no GPS on this visit" is information the
      // office needs, and silently dropping it looks identical to never having
      // opened the farm at all.
      await repo
        .recordCheckIn({
          farmId: farm.id,
          glowFarmId: farm.glowFarmId,
          userId,
          at: nowIso(),
          phase,
          point,
          accuracyMeters,
          distanceMiles: verdict.distanceMiles,
          verdict: verdict.verdict,
        })
        .catch(() => {});
    })();

    return () => {
      alive = false;
    };
  }, [farm, userId, phase]);

  return result;
}
