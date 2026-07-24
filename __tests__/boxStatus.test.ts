import {
  BOX_INSTALL_STATUSES,
  BOX_INSTALL_STATUS_TONE,
  canTransitionBoxInstall,
  deriveOverallFromBoxInstall,
} from '@/domain/status';

describe('box-install status system', () => {
  it('derives the overall status from the box status', () => {
    expect(deriveOverallFromBoxInstall('ready_for_assignment', 'box_install_ready')).toBe('box_install_ready');
    expect(deriveOverallFromBoxInstall('hardware_installed', 'box_install_ready')).toBe('box_install_in_progress');
    expect(deriveOverallFromBoxInstall('connectivity_failed', 'box_install_in_progress')).toBe('field_correction_required');
    expect(deriveOverallFromBoxInstall('correction_required', 'box_install_in_progress')).toBe('field_correction_required');
    expect(deriveOverallFromBoxInstall('complete', 'box_install_in_progress')).toBe('field_ops_complete');
    expect(deriveOverallFromBoxInstall('waiting_for_pto', 'box_install_ready')).toBe('waiting_for_pto');
  });

  it('guards transitions through the install flow', () => {
    expect(canTransitionBoxInstall('hardware_installed', 'connectivity_test_pending')).toBe(true);
    expect(canTransitionBoxInstall('post_install_photos_submitted', 'under_review')).toBe(true);
    expect(canTransitionBoxInstall('under_review', 'approved')).toBe(true);
    expect(canTransitionBoxInstall('under_review', 'correction_required')).toBe(true);
    expect(canTransitionBoxInstall('complete', 'assigned')).toBe(false);
  });

  it('has a tone for every box status', () => {
    for (const s of BOX_INSTALL_STATUSES) {
      expect(BOX_INSTALL_STATUS_TONE[s]).toBeTruthy();
    }
  });
});
