import type { Farm, User } from '@/domain/types';
import { matchesWorkerFilter, summarizeAssignments } from '@/features/assignments/summarize';

const users: Record<string, User> = {
  dan: { id: 'dan', name: 'Dan W', email: 'd', role: 'photographer', active: true },
  sam: { id: 'sam', name: 'Sam R', email: 's', role: 'installer', active: true },
};

function farm(id: string, patch: Partial<Farm> = {}): Farm {
  return {
    id,
    glowFarmId: `GF-${id}`,
    name: id,
    address: id,
    state: 'Colorado',
    overallStatus: 'pre_install_needed',
    preInstallStatus: 'assigned',
    ptoStatus: 'not_reached',
    createdAt: '',
    updatedAt: '',
    ...patch,
  };
}

describe('summarizeAssignments', () => {
  it('groups by the assigned photographer and keeps counts consistent', () => {
    const farms = [
      farm('1', { assignedPhotographerId: 'dan' }),
      farm('2', { assignedPhotographerId: 'dan', preInstallStatus: 'approved' }),
      farm('3', { assignedPhotographerId: 'dan', preInstallStatus: 'retake_required' }),
      farm('4'), // unassigned — excluded
    ];
    const [dan, ...rest] = summarizeAssignments(farms, users, 'photographer');
    expect(rest).toHaveLength(0);
    expect(dan.userName).toBe('Dan W');
    expect(dan.farmCount).toBe(3);
    expect(dan.completed).toBe(1);
    expect(dan.remaining).toBe(2);
    expect(dan.completed + dan.remaining).toBe(dan.farmCount);
    expect(dan.retakes).toBe(1);
    expect(dan.states).toEqual(['Colorado']);
  });

  it('switches to the installer assignment and box statuses', () => {
    const farms = [
      farm('1', { assignedInstallerId: 'sam', boxInstallStatus: 'complete' }),
      farm('2', { assignedInstallerId: 'sam', boxInstallStatus: 'correction_required' }),
      farm('3', { assignedPhotographerId: 'dan' }),
    ];
    const summaries = summarizeAssignments(farms, users, 'installer');
    expect(summaries).toHaveLength(1);
    expect(summaries[0].userId).toBe('sam');
    expect(summaries[0].completed).toBe(1);
    expect(summaries[0].retakes).toBe(1);
  });

  it('counts awaiting-review farms', () => {
    const farms = [
      farm('1', { assignedPhotographerId: 'dan', preInstallStatus: 'photos_submitted' }),
      farm('2', { assignedPhotographerId: 'dan', preInstallStatus: 'under_review' }),
      farm('3', { assignedPhotographerId: 'dan' }),
    ];
    expect(summarizeAssignments(farms, users, 'photographer')[0].awaitingReview).toBe(2);
  });
});

describe('matchesWorkerFilter', () => {
  it('slices by category', () => {
    const done = farm('a', { preInstallStatus: 'approved' });
    const retake = farm('b', { preInstallStatus: 'retake_required' });
    expect(matchesWorkerFilter(done, 'completed', 'photographer')).toBe(true);
    expect(matchesWorkerFilter(done, 'remaining', 'photographer')).toBe(false);
    expect(matchesWorkerFilter(retake, 'retakes', 'photographer')).toBe(true);
    expect(matchesWorkerFilter(retake, 'all', 'photographer')).toBe(true);
  });

  it('treats a past scheduled date on unfinished work as overdue', () => {
    const overdue = farm('c', { scheduledDate: '2020-01-01' });
    const finished = farm('d', { scheduledDate: '2020-01-01', preInstallStatus: 'approved' });
    expect(matchesWorkerFilter(overdue, 'overdue', 'photographer')).toBe(true);
    expect(matchesWorkerFilter(finished, 'overdue', 'photographer')).toBe(false);
  });
});
