import {
  BOX_INSTALL_STATUS_LABEL,
  BOX_INSTALL_STATUS_TONE,
  OVERALL_STATUS_LABEL,
  OVERALL_STATUS_TONE,
  PRE_INSTALL_STATUS_LABEL,
  PRE_INSTALL_STATUS_TONE,
  type BoxInstallStatus,
  type OverallStatus,
  type PreInstallStatus,
} from '@/domain/status';
import type { StatusTone } from '@/theme';

export function preInstallStatus(s: PreInstallStatus): { label: string; tone: StatusTone } {
  return { label: PRE_INSTALL_STATUS_LABEL[s], tone: PRE_INSTALL_STATUS_TONE[s] };
}

export function overallStatus(s: OverallStatus): { label: string; tone: StatusTone } {
  return { label: OVERALL_STATUS_LABEL[s], tone: OVERALL_STATUS_TONE[s] };
}

export function boxInstallStatus(s: BoxInstallStatus): { label: string; tone: StatusTone } {
  return { label: BOX_INSTALL_STATUS_LABEL[s], tone: BOX_INSTALL_STATUS_TONE[s] };
}

export function syncTone(s: 'queued' | 'uploading' | 'uploaded' | 'failed'): StatusTone {
  switch (s) {
    case 'uploaded':
      return 'success';
    case 'uploading':
      return 'progress';
    case 'failed':
      return 'danger';
    default:
      return 'warning';
  }
}

export const SYNC_LABEL: Record<'queued' | 'uploading' | 'uploaded' | 'failed', string> = {
  queued: 'Queued',
  uploading: 'Uploading',
  uploaded: 'Synced',
  failed: 'Failed',
};
