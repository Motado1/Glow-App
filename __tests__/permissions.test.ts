import { can, canSeeFarm, homeRouteForRole, isAdminRole, visibleFarms } from '@/domain/permissions';
import type { Farm, User } from '@/domain/types';

const admin: User = { id: 'a', name: 'Admin', email: 'a', role: 'admin', active: true };
const dan: User = { id: 'dan', name: 'Dan', email: 'd', role: 'photographer', active: true };

function farm(id: string, photographerId?: string): Farm {
  return {
    id,
    glowFarmId: id,
    name: id,
    address: id,
    state: 'CO',
    overallStatus: 'pre_install_needed',
    preInstallStatus: 'assigned',
    ptoStatus: 'not_reached',
    assignedPhotographerId: photographerId,
    createdAt: '',
    updatedAt: '',
  };
}

describe('RBAC', () => {
  it('gates capabilities by role', () => {
    expect(can('admin', 'assign_farms')).toBe(true);
    expect(can('photographer', 'assign_farms')).toBe(false);
    expect(can('photographer', 'capture_photos')).toBe(true);
    expect(can('reviewer', 'review_photos')).toBe(true);
  });

  it('limits a photographer to their own farms', () => {
    const farms = [farm('1', 'dan'), farm('2', 'other'), farm('3')];
    expect(visibleFarms(admin, farms)).toHaveLength(3);
    expect(visibleFarms(dan, farms).map((f) => f.id)).toEqual(['1']);
    expect(canSeeFarm(dan, farm('x', 'dan'))).toBe(true);
    expect(canSeeFarm(dan, farm('y', 'nope'))).toBe(false);
  });

  it('routes users home by role', () => {
    expect(isAdminRole('reviewer')).toBe(true);
    expect(isAdminRole('photographer')).toBe(false);
    expect(homeRouteForRole('admin')).toContain('admin');
    expect(homeRouteForRole('photographer')).toContain('field');
  });
});
