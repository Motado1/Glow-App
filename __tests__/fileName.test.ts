import { buildPhotoFileName, pad2, sanitizeToken } from '@/features/photos/fileName';

describe('photo file naming', () => {
  it('builds the audit-friendly name from the spec', () => {
    expect(
      buildPhotoFileName({ glowFarmId: 'GlowFarm12345', phase: 'pre_install', checklistKey: 'Meter', index: 1, dateIso: '2026-07-23T10:00:00.000Z' }),
    ).toBe('GlowFarm12345_PreInstall_Meter_01_2026-07-23.jpg');
  });

  it('handles post-install + custom extension', () => {
    expect(
      buildPhotoFileName({ glowFarmId: 'GF-1', phase: 'post_install', checklistKey: 'Box Interior', index: 12, dateIso: '2026-01-02', ext: 'png' }),
    ).toBe('GF1_PostInstall_BoxInterior_12_2026-01-02.png');
  });

  it('sanitizes tokens and zero-pads', () => {
    expect(sanitizeToken('Box / Interior #2')).toBe('BoxInterior2');
    expect(pad2(3)).toBe('03');
    expect(pad2(10)).toBe('10');
  });
});
