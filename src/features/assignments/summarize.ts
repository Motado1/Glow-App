/**
 * Group farms by the worker they're assigned to, with the counts the admin
 * dashboard needs. Pure (no React, no repository) so it's unit-testable.
 */
import { isBoxInstallDone, isPreInstallDone } from '@/domain/status';
import type { AssignmentSummary, Farm, User, WorkRole } from '@/domain/types';
import { isOverdue } from '@/lib/date';

/** Categories mirroring the dashboard metric tiles. */
export type WorkerFilter =
  | 'all'
  | 'remaining'
  | 'awaiting_review'
  | 'retakes'
  | 'overdue'
  | 'completed';

export const WORKER_FILTERS: { value: WorkerFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'remaining', label: 'Remaining' },
  { value: 'awaiting_review', label: 'Awaiting review' },
  { value: 'retakes', label: 'Retakes' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
];

/** Is this farm's work finished, for the given worker role? */
export function isFarmDone(f: Farm, role: WorkRole): boolean {
  return role === 'installer'
    ? isBoxInstallDone(f.boxInstallStatus)
    : isPreInstallDone(f.preInstallStatus);
}

export function matchesWorkerFilter(f: Farm, filter: WorkerFilter, role: WorkRole): boolean {
  const done = isFarmDone(f, role);
  switch (filter) {
    case 'all':
      return true;
    case 'completed':
      return done;
    case 'remaining':
      return !done;
    case 'overdue':
      return isOverdue(f.scheduledDate, done);
    case 'retakes':
      return role === 'installer'
        ? f.boxInstallStatus === 'correction_required'
        : f.preInstallStatus === 'retake_required';
    case 'awaiting_review':
      return role === 'installer'
        ? f.boxInstallStatus === 'post_install_photos_submitted' || f.boxInstallStatus === 'under_review'
        : f.preInstallStatus === 'photos_submitted' || f.preInstallStatus === 'under_review';
    default:
      return true;
  }
}

/**
 * One O(n) pass over the farms. Workers with no assigned farms are omitted.
 * Sorted by most-remaining first so whoever needs attention floats to the top.
 */
export function summarizeAssignments(
  farms: Farm[],
  userMap: Record<string, User>,
  role: WorkRole,
): AssignmentSummary[] {
  const map = new Map<string, AssignmentSummary>();

  for (const f of farms) {
    const uid = role === 'installer' ? f.assignedInstallerId : f.assignedPhotographerId;
    if (!uid) continue;

    let s = map.get(uid);
    if (!s) {
      s = {
        userId: uid,
        userName: userMap[uid]?.name ?? 'Unassigned worker',
        role,
        states: [],
        farmCount: 0,
        completed: 0,
        remaining: 0,
        overdue: 0,
        awaitingReview: 0,
        retakes: 0,
        farmIds: [],
        farms: [],
      };
      map.set(uid, s);
    }

    s.farmCount++;
    s.farmIds.push(f.id);
    s.farms.push(f);
    if (f.state && !s.states.includes(f.state)) s.states.push(f.state);

    if (isFarmDone(f, role)) s.completed++;
    else s.remaining++;
    if (matchesWorkerFilter(f, 'overdue', role)) s.overdue++;
    if (matchesWorkerFilter(f, 'awaiting_review', role)) s.awaitingReview++;
    if (matchesWorkerFilter(f, 'retakes', role)) s.retakes++;
  }

  const out = [...map.values()];
  for (const s of out) s.states.sort();
  return out.sort((a, b) => b.remaining - a.remaining || a.userName.localeCompare(b.userName));
}
