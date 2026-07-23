/**
 * Consistent, audit-friendly photo file names (requirements §8), e.g.
 *   GlowFarm12345_PreInstall_Meter_01_2026-07-23.jpg
 *   GlowFarm12345_PostInstall_BoxInterior_01_2026-07-23.jpg
 *
 * The Glow farm ID is always the prefix so a file can be traced to its farm.
 */
import type { PhotoPhase } from '@/domain/types';

const PHASE_TOKEN: Record<PhotoPhase, string> = {
  pre_install: 'PreInstall',
  post_install: 'PostInstall',
};

export function sanitizeToken(s: string): string {
  return s.replace(/[^A-Za-z0-9]+/g, '');
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function buildPhotoFileName(params: {
  glowFarmId: string;
  phase: PhotoPhase;
  checklistKey: string;
  /** 1-based sequence within the checklist item. */
  index: number;
  /** ISO date or datetime; only the YYYY-MM-DD part is used. */
  dateIso: string;
  ext?: string;
}): string {
  const { glowFarmId, phase, checklistKey, index, dateIso, ext = 'jpg' } = params;
  const date = dateIso.slice(0, 10);
  const stem = [
    sanitizeToken(glowFarmId),
    PHASE_TOKEN[phase],
    sanitizeToken(checklistKey),
    pad2(index),
    date,
  ].join('_');
  return `${stem}.${ext.replace(/^\./, '')}`;
}
