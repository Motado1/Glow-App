import { useMemo } from 'react';
import type { HomeBase } from '@/features/routing/startPoint';
import { useCurrentUser } from './authStore';

/**
 * The signed-in worker's home base as a route start, if an admin set one and it
 * geocoded. Otherwise undefined, and routing falls back as it always did.
 */
export function useHomeBase(): HomeBase | undefined {
  const user = useCurrentUser();
  return useMemo(
    () =>
      user?.homeBaseLocation
        ? { point: user.homeBaseLocation, label: user.homeBase ?? 'Home base' }
        : undefined,
    [user?.homeBaseLocation, user?.homeBase],
  );
}
