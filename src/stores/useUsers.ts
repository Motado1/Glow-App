import { useMemo } from 'react';
import { repo } from '@/data';
import type { User } from '@/domain/types';
import { useRepoQuery } from './useRepoQuery';

/** A lookup of userId → User, for showing assignee names. */
export function useUserMap(): Record<string, User> {
  const { data } = useRepoQuery(() => repo.listUsers(), []);
  return useMemo(() => Object.fromEntries((data ?? []).map((u) => [u.id, u])), [data]);
}
