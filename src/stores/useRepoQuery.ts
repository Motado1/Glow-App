/**
 * Small reactive-query hook over the repository. Runs an async read, then
 * re-runs whenever one of the watched entities emits a change (the local
 * realtime seam) — so e.g. the admin review queue refreshes the moment a
 * photographer submits, with no manual plumbing.
 */
import { type DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { repo } from '@/data';
import type { EntityKind } from '@/domain/types';

export function useRepoQuery<T>(
  run: () => Promise<T>,
  deps: DependencyList,
  watch: EntityKind[] = [],
): { data: T | undefined; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const runRef = useRef(run);
  runRef.current = run;

  const refresh = useCallback(() => {
    let alive = true;
    setLoading(true);
    runRef
      .current()
      .then((r) => {
        if (alive) {
          setData(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const cancel = refresh();
    const unsubs = watch.map((e) => repo.subscribe(e, () => refresh()));
    return () => {
      cancel?.();
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  return { data, loading, refresh };
}
