import {
  canTransitionPreInstall,
  deriveOverallFromPreInstall,
  isPreInstallProblem,
  PRE_INSTALL_STATUSES,
} from '@/domain/status';

describe('status system', () => {
  it('carries the full pre-install vocabulary (not just complete/incomplete)', () => {
    expect(PRE_INSTALL_STATUSES).toContain('retake_required');
    expect(PRE_INSTALL_STATUSES).toContain('unable_to_access');
    expect(PRE_INSTALL_STATUSES.length).toBe(13);
  });

  it('guards transitions', () => {
    expect(canTransitionPreInstall('under_review', 'approved')).toBe(true);
    expect(canTransitionPreInstall('under_review', 'retake_required')).toBe(true);
    expect(canTransitionPreInstall('approved', 'assigned')).toBe(false);
  });

  it('derives the overall status from pre-install', () => {
    expect(deriveOverallFromPreInstall('approved', 'pre_install_needed')).toBe('pre_install_approved');
    expect(deriveOverallFromPreInstall('retake_required', 'pre_install_in_progress')).toBe('field_correction_required');
    expect(deriveOverallFromPreInstall('in_progress', 'pre_install_needed')).toBe('pre_install_in_progress');
  });

  it('does not regress a farm already past the pre-install phase', () => {
    expect(deriveOverallFromPreInstall('in_progress', 'waiting_for_pto')).toBe('waiting_for_pto');
  });

  it('flags problem statuses', () => {
    expect(isPreInstallProblem('address_problem')).toBe(true);
    expect(isPreInstallProblem('in_progress')).toBe(false);
  });
});
