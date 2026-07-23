/**
 * Pure sync-outbox reducer (requirements §12). The offline queue is modelled as
 * a local-first outbox: writes are optimistic, each produces an idempotent task,
 * and a SyncEngine drains them when "online". These functions hold all the
 * transition/backoff logic and take the clock as an argument so they're fully
 * unit-testable with no React Native runtime.
 */

export type SyncTaskType = 'photo-upload' | 'farm-update' | 'submission' | 'review';
export type SyncTaskStatus = 'pending' | 'in_progress' | 'done' | 'error';

export interface SyncTask {
  id: string;
  type: SyncTaskType;
  /** The entity this task acts on, e.g. a photo id. */
  refId: string;
  status: SyncTaskStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
  /** Epoch ms before which the task should not be retried (backoff). */
  nextAttemptAt?: number;
}

export const MAX_ATTEMPTS = 5;

/** Capped exponential backoff: 2s, 4s, 8s, 16s, 32s. */
export function backoffMs(attempts: number): number {
  return Math.min(2000 * 2 ** Math.max(0, attempts), 32000);
}

export function makeTask(input: {
  id: string;
  type: SyncTaskType;
  refId: string;
  nowIso: string;
}): SyncTask {
  return {
    id: input.id,
    type: input.type,
    refId: input.refId,
    status: 'pending',
    attempts: 0,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
}

/** The next task eligible to run, respecting backoff and the attempt cap. */
export function nextRunnableTask(tasks: SyncTask[], nowMs: number): SyncTask | undefined {
  return tasks.find(
    (t) =>
      (t.status === 'pending' || t.status === 'error') &&
      t.attempts < MAX_ATTEMPTS &&
      (t.nextAttemptAt === undefined || t.nextAttemptAt <= nowMs),
  );
}

export function markInProgress(task: SyncTask, nowIso: string): SyncTask {
  return { ...task, status: 'in_progress', updatedAt: nowIso };
}

export function markDone(task: SyncTask, nowIso: string): SyncTask {
  return { ...task, status: 'done', updatedAt: nowIso, lastError: undefined };
}

/**
 * Record a failed attempt. Schedules a backoff retry unless the attempt cap is
 * reached, in which case the task stays in `error` and is no longer runnable.
 */
export function markError(
  task: SyncTask,
  error: string,
  nowIso: string,
  nowMs: number,
): SyncTask {
  const attempts = task.attempts + 1;
  return {
    ...task,
    status: 'error',
    attempts,
    lastError: error,
    updatedAt: nowIso,
    nextAttemptAt: attempts < MAX_ATTEMPTS ? nowMs + backoffMs(attempts) : undefined,
  };
}

export function isPermanentlyFailed(task: SyncTask): boolean {
  return task.status === 'error' && task.attempts >= MAX_ATTEMPTS;
}

export function pendingCount(tasks: SyncTask[]): number {
  return tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
}

export function retryableErrorCount(tasks: SyncTask[]): number {
  return tasks.filter((t) => t.status === 'error' && t.attempts < MAX_ATTEMPTS).length;
}

export function failedCount(tasks: SyncTask[]): number {
  return tasks.filter(isPermanentlyFailed).length;
}

/** Remove completed tasks (housekeeping after a successful drain). */
export function pruneDone(tasks: SyncTask[]): SyncTask[] {
  return tasks.filter((t) => t.status !== 'done');
}
