/**
 * Role-based access control (requirements §2).
 *
 * Visibility rules:
 *  - Admin & reviewer see everything relevant to field operations.
 *  - A photographer/installer sees ONLY the farms assigned to them — never
 *    other workers' assignments, contracts, or wallet details.
 */

import type { Farm, Role, User } from './types';

export type Capability =
  | 'view_all_farms'
  | 'import_farms'
  | 'assign_farms'
  | 'reassign_farms'
  | 'review_photos'
  | 'manage_users'
  | 'configure_checklists'
  | 'export_data'
  | 'view_dashboard'
  | 'capture_photos'
  | 'plan_route'
  | 'report_problems';

const ALL_CAPS: Capability[] = [
  'view_all_farms',
  'import_farms',
  'assign_farms',
  'reassign_farms',
  'review_photos',
  'manage_users',
  'configure_checklists',
  'export_data',
  'view_dashboard',
  'capture_photos',
  'plan_route',
  'report_problems',
];

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  admin: ALL_CAPS,
  reviewer: ['view_all_farms', 'review_photos', 'export_data', 'view_dashboard'],
  photographer: ['capture_photos', 'plan_route', 'report_problems'],
  installer: ['capture_photos', 'plan_route', 'report_problems'],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  reviewer: 'Reviewer',
  photographer: 'Field Photographer',
  installer: 'Box Installer',
};

export function can(role: Role, cap: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(cap);
}

export function isAdminRole(role: Role): boolean {
  return role === 'admin' || role === 'reviewer';
}

export function isFieldRole(role: Role): boolean {
  return role === 'photographer' || role === 'installer';
}

/** Landing route after login, by role. */
export function homeRouteForRole(role: Role): string {
  return isAdminRole(role) ? '/(admin)/dashboard' : '/(field)/farms';
}

/** Can this user see this specific farm? */
export function canSeeFarm(user: User, farm: Farm): boolean {
  if (isAdminRole(user.role)) return true;
  if (user.role === 'photographer') return farm.assignedPhotographerId === user.id;
  if (user.role === 'installer') return farm.assignedInstallerId === user.id;
  return false;
}

/** Filter a farm list down to what a user is allowed to see. */
export function visibleFarms(user: User, farms: Farm[]): Farm[] {
  if (isAdminRole(user.role)) return farms;
  return farms.filter((f) => canSeeFarm(user, f));
}

/**
 * Whether the user may see / use customer contact details for a farm.
 * Field workers only get contact info for farms assigned to them (they need it
 * to coordinate access); this is the "call or message when permitted" rule.
 */
export function canContactFarm(user: User, farm: Farm): boolean {
  if (isAdminRole(user.role)) return true;
  return canSeeFarm(user, farm) && !!farm.contact;
}
