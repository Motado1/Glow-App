import type { Photo } from '@/domain/types';
import { canSubmit, computeChecklistProgress, DEFAULT_PRE_INSTALL_CHECKLIST, missingRequired } from '@/features/photos/checklist';

let seq = 0;
function photo(itemId: string, key: string, reviewState: Photo['reviewState'] = 'pending'): Photo {
  return {
    id: `${key}-${seq++}`,
    farmId: 'f',
    glowFarmId: 'g',
    phase: 'pre_install',
    checklistItemId: itemId,
    checklistKey: key,
    fileName: 'x',
    localKey: 'x',
    source: 'camera',
    syncState: 'uploaded',
    attempts: 0,
    reviewState,
    capturedAt: '',
    capturedBy: 'u',
  };
}

describe('checklist validation', () => {
  const required = DEFAULT_PRE_INSTALL_CHECKLIST.filter((c) => c.required);

  it('blocks submit until all required items have a usable photo', () => {
    expect(canSubmit(DEFAULT_PRE_INSTALL_CHECKLIST, [])).toBe(false);
    expect(missingRequired(DEFAULT_PRE_INSTALL_CHECKLIST, [])).toHaveLength(required.length);
  });

  it('allows submit once every required item is covered', () => {
    const photos = required.map((i) => photo(i.id, i.key));
    expect(canSubmit(DEFAULT_PRE_INSTALL_CHECKLIST, photos)).toBe(true);
  });

  it('a rejected-only item is unsatisfied and needs a retake', () => {
    const item = required[0];
    const pr = computeChecklistProgress([item], [photo(item.id, item.key, 'rejected')]);
    expect(pr[0].satisfied).toBe(false);
    expect(pr[0].needsRetake).toBe(true);
  });
});
