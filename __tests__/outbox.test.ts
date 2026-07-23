import {
  backoffMs,
  isPermanentlyFailed,
  makeTask,
  markDone,
  markError,
  markInProgress,
  MAX_ATTEMPTS,
  nextRunnableTask,
  pendingCount,
  pruneDone,
} from '@/features/sync/outbox';

const t0 = '2026-07-23T00:00:00.000Z';
const mk = (id: string) => makeTask({ id, type: 'photo-upload', refId: `p${id}`, nowIso: t0 });

describe('sync outbox reducer', () => {
  it('creates a pending task', () => {
    const t = mk('1');
    expect(t.status).toBe('pending');
    expect(t.attempts).toBe(0);
  });

  it('selects the next runnable and skips in-progress', () => {
    const a = mk('1');
    expect(nextRunnableTask([a], 1000)?.id).toBe('1');
    expect(nextRunnableTask([markInProgress(a, t0)], 1000)).toBeUndefined();
  });

  it('backs off, then permanently fails at the attempt cap', () => {
    let t = mk('1');
    for (let i = 0; i < MAX_ATTEMPTS; i++) t = markError(t, 'boom', t0, 0);
    expect(t.attempts).toBe(MAX_ATTEMPTS);
    expect(isPermanentlyFailed(t)).toBe(true);
    expect(nextRunnableTask([t], 10_000_000)).toBeUndefined();
  });

  it('grows backoff and caps it', () => {
    expect(backoffMs(1)).toBeLessThan(backoffMs(3));
    expect(backoffMs(10)).toBe(32000);
  });

  it('prunes done tasks and counts pending', () => {
    const a = markDone(mk('1'), t0);
    const b = mk('2');
    expect(pruneDone([a, b])).toHaveLength(1);
    expect(pendingCount([a, b])).toBe(1);
  });
});
