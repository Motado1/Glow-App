import type { Farm } from '@/domain/types';
import { DEFAULT_START, resolveStart } from '@/features/routing/startPoint';

function farm(id: string, lat?: number, lng?: number): Farm {
  return {
    id,
    glowFarmId: `GF-${id}`,
    name: `Farm ${id}`,
    address: id,
    location: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    state: 'CO',
    overallStatus: 'pre_install_needed',
    preInstallStatus: 'assigned',
    ptoStatus: 'not_reached',
    createdAt: '',
    updatedAt: '',
  };
}

describe('resolveStart', () => {
  const farms = [farm('nocoord'), farm('a', 40, -105), farm('b', 41, -104)];

  it('uses the device location', () => {
    const r = resolveStart({ kind: 'current', point: { lat: 1, lng: 2 } }, farms);
    expect(r.point).toEqual({ lat: 1, lng: 2 });
    expect(r.label).toMatch(/current location/i);
  });

  it('uses a manual point with its label', () => {
    const r = resolveStart({ kind: 'manual', point: { lat: 3, lng: 4 }, label: 'Hotel' }, farms);
    expect(r.point).toEqual({ lat: 3, lng: 4 });
    expect(r.label).toBe('Hotel');
  });

  it('starts at a chosen farm', () => {
    const r = resolveStart({ kind: 'farm', farmId: 'b' }, farms);
    expect(r.point).toEqual({ lat: 41, lng: -104 });
    expect(r.label).toBe('Farm b');
  });

  it('falls back when the chosen farm is gone or has no coordinates', () => {
    expect(resolveStart({ kind: 'farm', farmId: 'missing' }, farms).point).toEqual({ lat: 40, lng: -105 });
    expect(resolveStart({ kind: 'farm', farmId: 'nocoord' }, farms).point).toEqual({ lat: 40, lng: -105 });
  });

  it('auto-picks the first farm with coordinates', () => {
    expect(resolveStart({ kind: 'auto' }, farms).point).toEqual({ lat: 40, lng: -105 });
  });

  it('falls back to the default when nothing has coordinates', () => {
    const r = resolveStart({ kind: 'auto' }, [farm('x')]);
    expect(r.point).toEqual(DEFAULT_START);
    expect(r.label).toMatch(/default/i);
  });
});
