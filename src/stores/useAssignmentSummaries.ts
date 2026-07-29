import { useMemo } from 'react';
import type { AssignmentSummary, Farm, WorkRole } from '@/domain/types';
import { summarizeAssignments } from '@/features/assignments/summarize';
import { useUserMap } from './useUsers';

/**
 * Takes `farms` as an argument rather than fetching them: the dashboard already
 * holds the list, and `useRepoQuery` has no dedupe — a second call would mean a
 * redundant read plus a duplicate subscription on every farms change.
 */
export function useAssignmentSummaries(
  farms: Farm[] | undefined,
  role: WorkRole,
): AssignmentSummary[] {
  const users = useUserMap();
  return useMemo(() => summarizeAssignments(farms ?? [], users, role), [farms, users, role]);
}
