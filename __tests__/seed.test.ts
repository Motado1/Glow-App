import { buildEmptyWorkspace } from '@/data/local/seed';
import { buildSampleData } from '@/data/local/sampleData';

describe('a fresh install', () => {
  const empty = buildEmptyWorkspace();

  it('starts with no work in it at all', () => {
    expect(empty.farms).toHaveLength(0);
    expect(empty.photos).toHaveLength(0);
    expect(empty.submissions).toHaveLength(0);
    expect(empty.problems).toHaveLength(0);
    expect(empty.activity).toHaveLength(0);
    expect(empty.notifications).toHaveLength(0);
    expect(empty.boxInstallations).toHaveLength(0);
  });

  it('keeps exactly one active administrator, so sign-in is possible', () => {
    expect(empty.users).toHaveLength(1);
    expect(empty.users[0].role).toBe('admin');
    expect(empty.users[0].active).toBe(true);
    expect(empty.users[0].email).toContain('@');
  });
});

describe('sample data', () => {
  const seed = buildSampleData();

  it('is opt-in — never part of a fresh workspace', () => {
    expect(buildEmptyWorkspace().farms).toHaveLength(0);
    expect(seed.farms.length).toBeGreaterThan(60);
  });

  it('includes the founding admin so sign-in survives loading it', () => {
    expect(seed.users.some((u) => u.role === 'admin' && u.active)).toBe(true);
  });

  it('includes both pre-install and box-install-stage farms', () => {
    expect(seed.farms.length).toBeGreaterThan(60);
    expect(seed.farms.some((f) => f.boxInstallStatus === 'ready_for_assignment')).toBe(true);
    expect(seed.farms.some((f) => f.boxInstallStatus === 'complete')).toBe(true);
    expect(seed.farms.some((f) => f.preInstallStatus === 'ready_for_assignment')).toBe(true);
  });

  it('seeds box installations incl. an approved one and a failed connectivity one', () => {
    expect(seed.boxInstallations.length).toBeGreaterThan(0);
    expect(seed.boxInstallations.some((b) => b.finalApproved)).toBe(true);
    expect(seed.boxInstallations.some((b) => b.connectivityTest.status === 'failed')).toBe(true);
  });

  it('seeds a post-install submission awaiting review', () => {
    expect(seed.submissions.some((s) => s.phase === 'post_install' && s.status === 'submitted')).toBe(true);
  });

  it('gives every farm a unique Glow farm ID', () => {
    const ids = seed.farms.map((f) => f.glowFarmId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
