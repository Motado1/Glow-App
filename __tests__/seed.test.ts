import { buildSeed } from '@/data/local/seed';

describe('demo seed', () => {
  const seed = buildSeed();

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
