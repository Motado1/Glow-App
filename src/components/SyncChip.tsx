import { Pressable } from 'react-native';
import { Badge } from '@/components/ui';
import { MAX_ATTEMPTS } from '@/features/sync/outbox';
import { useSyncStore } from '@/stores/syncStore';
import type { StatusTone } from '@/theme';

/**
 * Live sync-status chip. Tapping it toggles the dev offline override so the
 * offline → queue → sync flow can be demonstrated on command.
 */
export function SyncChip() {
  const deviceOnline = useSyncStore((s) => s.deviceOnline);
  const manualOffline = useSyncStore((s) => s.manualOffline);
  const tasks = useSyncStore((s) => s.tasks);
  const toggle = useSyncStore((s) => s.toggleManualOffline);

  const online = deviceOnline && !manualOffline;
  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
  const failed = tasks.filter((t) => t.status === 'error' && t.attempts >= MAX_ATTEMPTS).length;

  let label: string;
  let tone: StatusTone;
  if (!online) {
    label = 'Offline';
    tone = 'warning';
  } else if (pending > 0) {
    label = `Syncing ${pending}`;
    tone = 'progress';
  } else if (failed > 0) {
    label = `${failed} failed`;
    tone = 'danger';
  } else {
    label = 'All synced';
    tone = 'success';
  }

  return (
    <Pressable onPress={toggle} hitSlop={8}>
      <Badge label={`${online ? '🟢' : '⚫'} ${label}`} tone={tone} />
    </Pressable>
  );
}
