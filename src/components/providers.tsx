/**
 * App-wide providers. Wires NetInfo connectivity into the sync store and
 * hydrates the offline outbox on mount.
 */
import { useEffect, type ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSyncStore } from '@/stores/syncStore';

export function SyncProvider({ children }: { children: ReactNode }) {
  const hydrate = useSyncStore((s) => s.hydrate);
  const setDeviceOnline = useSyncStore((s) => s.setDeviceOnline);

  useEffect(() => {
    void hydrate();
    const unsub = NetInfo.addEventListener((state) => {
      setDeviceOnline(state.isConnected !== false);
    });
    return () => unsub();
  }, [hydrate, setDeviceOnline]);

  return <>{children}</>;
}
