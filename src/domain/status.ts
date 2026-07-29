/**
 * The Glow field-operations status system (requirements §5).
 *
 * We model the FULL status vocabulary — pre-install, box-install, and overall —
 * so the data never collapses to "complete / incomplete" and we always know
 * exactly where a farm is stuck. Box-install statuses are defined now but not
 * used by any screen this pass (pre-install MVP scope).
 */

import type { StatusTone } from '@/theme';

/* ------------------------------------------------------------------ */
/* Pre-install statuses                                                */
/* ------------------------------------------------------------------ */

export const PRE_INSTALL_STATUSES = [
  'not_ready',
  'ready_for_assignment',
  'assigned',
  'route_planned',
  'in_progress',
  'photos_submitted',
  'under_review',
  'retake_required',
  'approved',
  'unable_to_access',
  'address_problem',
  'customer_contact_required',
  'complete',
] as const;
export type PreInstallStatus = (typeof PRE_INSTALL_STATUSES)[number];

export const PRE_INSTALL_STATUS_LABEL: Record<PreInstallStatus, string> = {
  not_ready: 'Not Ready',
  ready_for_assignment: 'Ready for Assignment',
  assigned: 'Assigned',
  route_planned: 'Route Planned',
  in_progress: 'In Progress',
  photos_submitted: 'Photos Submitted',
  under_review: 'Under Review',
  retake_required: 'Retake Required',
  approved: 'Approved',
  unable_to_access: 'Unable to Access',
  address_problem: 'Address Problem',
  customer_contact_required: 'Customer Contact Required',
  complete: 'Complete',
};

export const PRE_INSTALL_STATUS_TONE: Record<PreInstallStatus, StatusTone> = {
  not_ready: 'neutral',
  ready_for_assignment: 'info',
  assigned: 'info',
  route_planned: 'info',
  in_progress: 'progress',
  photos_submitted: 'progress',
  under_review: 'warning',
  retake_required: 'danger',
  approved: 'success',
  unable_to_access: 'danger',
  address_problem: 'danger',
  customer_contact_required: 'danger',
  complete: 'success',
};

/** Statuses that represent a field exception needing attention. */
export const PROBLEM_PRE_INSTALL_STATUSES: PreInstallStatus[] = [
  'unable_to_access',
  'address_problem',
  'customer_contact_required',
  'retake_required',
];

export function isPreInstallProblem(s: PreInstallStatus): boolean {
  return PROBLEM_PRE_INSTALL_STATUSES.includes(s);
}

/**
 * Field-reported blockers — the farm can't be worked right now.
 *
 * Deliberately EXCLUDES `retake_required`: a retake is a work instruction from
 * the office, not a problem, and must stay visible to the photographer.
 */
export const BLOCKED_PRE_INSTALL_STATUSES: PreInstallStatus[] = [
  'unable_to_access',
  'address_problem',
  'customer_contact_required',
];

export function isFieldBlocked(s: PreInstallStatus): boolean {
  return BLOCKED_PRE_INSTALL_STATUSES.includes(s);
}

/** Pre-install work that is finished. Single source of truth. */
export const PRE_INSTALL_DONE_STATUSES: PreInstallStatus[] = ['approved', 'complete'];

export function isPreInstallDone(s: PreInstallStatus): boolean {
  return PRE_INSTALL_DONE_STATUSES.includes(s);
}

export function isBoxInstallDone(s?: BoxInstallStatus): boolean {
  return s === 'complete';
}

/**
 * Allowed pre-install transitions. Used to guard status changes so the UI can
 * only move a farm somewhere sensible. Problem states can be reached from most
 * active states and can recover back to the active flow.
 */
export const PRE_INSTALL_TRANSITIONS: Record<PreInstallStatus, PreInstallStatus[]> = {
  not_ready: ['ready_for_assignment'],
  ready_for_assignment: ['assigned'],
  assigned: ['route_planned', 'in_progress', 'unable_to_access', 'address_problem', 'customer_contact_required'],
  route_planned: ['in_progress', 'unable_to_access', 'address_problem', 'customer_contact_required'],
  in_progress: ['photos_submitted', 'unable_to_access', 'address_problem', 'customer_contact_required'],
  photos_submitted: ['under_review'],
  under_review: ['approved', 'retake_required'],
  retake_required: ['in_progress', 'photos_submitted'],
  approved: ['complete'],
  unable_to_access: ['assigned', 'in_progress', 'ready_for_assignment'],
  address_problem: ['assigned', 'in_progress', 'ready_for_assignment'],
  customer_contact_required: ['assigned', 'in_progress', 'ready_for_assignment'],
  complete: [],
};

export function canTransitionPreInstall(from: PreInstallStatus, to: PreInstallStatus): boolean {
  if (from === to) return true;
  return PRE_INSTALL_TRANSITIONS[from]?.includes(to) ?? false;
}

/* ------------------------------------------------------------------ */
/* Box-install statuses (defined now, used in a later phase)           */
/* ------------------------------------------------------------------ */

export const BOX_INSTALL_STATUSES = [
  'waiting_for_pto',
  'pto_confirmed',
  'ready_for_assignment',
  'assigned',
  'installation_scheduled',
  'installer_en_route',
  'installation_started',
  'hardware_installed',
  'programming_required',
  'connectivity_test_pending',
  'connectivity_failed',
  'post_install_photos_submitted',
  'under_review',
  'correction_required',
  'approved',
  'complete',
] as const;
export type BoxInstallStatus = (typeof BOX_INSTALL_STATUSES)[number];

export const BOX_INSTALL_STATUS_LABEL: Record<BoxInstallStatus, string> = {
  waiting_for_pto: 'Waiting for PTO',
  pto_confirmed: 'PTO Confirmed',
  ready_for_assignment: 'Ready for Assignment',
  assigned: 'Assigned',
  installation_scheduled: 'Installation Scheduled',
  installer_en_route: 'Installer En Route',
  installation_started: 'Installation Started',
  hardware_installed: 'Hardware Installed',
  programming_required: 'Programming Required',
  connectivity_test_pending: 'Connectivity Test Pending',
  connectivity_failed: 'Connectivity Failed',
  post_install_photos_submitted: 'Post-Install Photos Submitted',
  under_review: 'Under Review',
  correction_required: 'Correction Required',
  approved: 'Approved',
  complete: 'Complete',
};

/* ------------------------------------------------------------------ */
/* Overall farm statuses                                               */
/* ------------------------------------------------------------------ */

export const OVERALL_STATUSES = [
  'pre_install_needed',
  'pre_install_in_progress',
  'pre_install_approved',
  'waiting_for_solar',
  'waiting_for_pto',
  'box_install_ready',
  'box_install_in_progress',
  'field_correction_required',
  'field_ops_complete',
  'audit_package_ready',
] as const;
export type OverallStatus = (typeof OVERALL_STATUSES)[number];

export const OVERALL_STATUS_LABEL: Record<OverallStatus, string> = {
  pre_install_needed: 'Pre-Install Needed',
  pre_install_in_progress: 'Pre-Install in Progress',
  pre_install_approved: 'Pre-Install Approved',
  waiting_for_solar: 'Waiting for Solar Installation',
  waiting_for_pto: 'Waiting for PTO',
  box_install_ready: 'Box Installation Ready',
  box_install_in_progress: 'Box Installation in Progress',
  field_correction_required: 'Field Correction Required',
  field_ops_complete: 'Field Operations Complete',
  audit_package_ready: 'Audit Package Ready',
};

export const OVERALL_STATUS_TONE: Record<OverallStatus, StatusTone> = {
  pre_install_needed: 'neutral',
  pre_install_in_progress: 'progress',
  pre_install_approved: 'success',
  waiting_for_solar: 'neutral',
  waiting_for_pto: 'neutral',
  box_install_ready: 'info',
  box_install_in_progress: 'progress',
  field_correction_required: 'danger',
  field_ops_complete: 'success',
  audit_package_ready: 'success',
};

/**
 * Derive the overall farm status from the pre-install status. Keeps the
 * headline status in sync as the pre-install workflow advances. (Box-install
 * driven overall statuses come in a later phase.)
 */
export function deriveOverallFromPreInstall(
  pre: PreInstallStatus,
  current: OverallStatus,
): OverallStatus {
  // Don't override anything already past the pre-install phase.
  const pastPreInstall: OverallStatus[] = [
    'waiting_for_solar',
    'waiting_for_pto',
    'box_install_ready',
    'box_install_in_progress',
    'field_correction_required',
    'field_ops_complete',
    'audit_package_ready',
  ];
  if (pastPreInstall.includes(current)) return current;

  switch (pre) {
    case 'not_ready':
      return 'pre_install_needed';
    case 'ready_for_assignment':
      return 'pre_install_needed';
    case 'approved':
    case 'complete':
      return 'pre_install_approved';
    case 'unable_to_access':
    case 'address_problem':
    case 'customer_contact_required':
    case 'retake_required':
      return 'field_correction_required';
    default:
      return 'pre_install_in_progress';
  }
}

/* ------------------------------------------------------------------ */
/* Box-install tone, transitions, and overall derivation              */
/* ------------------------------------------------------------------ */

export const BOX_INSTALL_STATUS_TONE: Record<BoxInstallStatus, StatusTone> = {
  waiting_for_pto: 'neutral',
  pto_confirmed: 'info',
  ready_for_assignment: 'info',
  assigned: 'info',
  installation_scheduled: 'info',
  installer_en_route: 'progress',
  installation_started: 'progress',
  hardware_installed: 'progress',
  programming_required: 'warning',
  connectivity_test_pending: 'warning',
  connectivity_failed: 'danger',
  post_install_photos_submitted: 'progress',
  under_review: 'warning',
  correction_required: 'danger',
  approved: 'success',
  complete: 'success',
};

export const BOX_INSTALL_TRANSITIONS: Record<BoxInstallStatus, BoxInstallStatus[]> = {
  waiting_for_pto: ['pto_confirmed'],
  pto_confirmed: ['ready_for_assignment'],
  ready_for_assignment: ['assigned'],
  assigned: ['installation_scheduled', 'installer_en_route', 'installation_started'],
  installation_scheduled: ['installer_en_route', 'installation_started'],
  installer_en_route: ['installation_started'],
  installation_started: ['hardware_installed'],
  hardware_installed: ['programming_required', 'connectivity_test_pending'],
  programming_required: ['connectivity_test_pending'],
  connectivity_test_pending: ['connectivity_failed', 'post_install_photos_submitted'],
  connectivity_failed: ['connectivity_test_pending', 'post_install_photos_submitted'],
  post_install_photos_submitted: ['under_review'],
  under_review: ['approved', 'correction_required'],
  correction_required: ['installation_started', 'post_install_photos_submitted'],
  approved: ['complete'],
  complete: [],
};

export function canTransitionBoxInstall(from: BoxInstallStatus, to: BoxInstallStatus): boolean {
  if (from === to) return true;
  return BOX_INSTALL_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Map a box-install status onto the headline overall farm status. */
export function deriveOverallFromBoxInstall(
  box: BoxInstallStatus,
  _current: OverallStatus,
): OverallStatus {
  switch (box) {
    case 'waiting_for_pto':
      return 'waiting_for_pto';
    case 'pto_confirmed':
    case 'ready_for_assignment':
      return 'box_install_ready';
    case 'connectivity_failed':
    case 'correction_required':
      return 'field_correction_required';
    case 'approved':
    case 'complete':
      return 'field_ops_complete';
    default:
      return 'box_install_in_progress';
  }
}
