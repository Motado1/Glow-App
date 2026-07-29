import { router } from 'expo-router';
import { useState } from 'react';
import { FarmMap } from '@/components/map/FarmMap';
import { Header } from '@/components/Header';
import { SignOutButton } from '@/components/SignOutButton';
import { Button, Screen, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { spacing } from '@/theme';

const DONE = ['approved', 'complete'];

export default function FieldMap() {
  const user = useCurrentUser();
  const { data: farms } = useRepoQuery(() => (user ? repo.listFarms({ assignedTo: user.id }) : Promise.resolve([])), [user?.id], ['farms']);
  const [sel, setSel] = useState<string | undefined>();

  const isInstaller = user?.role === 'installer';
  const active = (farms ?? []).filter(
    (f) => f.location && (isInstaller ? f.boxInstallStatus !== 'complete' : !DONE.includes(f.preInstallStatus)),
  );
  const markers = active.map((f) => ({ id: f.id, lat: f.location!.lat, lng: f.location!.lng, label: f.name }));
  const selFarm = active.find((f) => f.id === sel);

  return (
    <Screen>
      <Header title="Map" subtitle={`${markers.length} stops plotted`} right={<SignOutButton />} />
      <FarmMap markers={markers} selectedId={sel} onSelect={setSel} />
      <Spacer />
      {selFarm ? (
        <>
          <Txt variant="subtitle">{selFarm.name}</Txt>
          <Txt variant="caption">{selFarm.address}</Txt>
          <Spacer size={spacing.sm} />
          <Button title="Open farm" icon="📋" onPress={() => router.push((isInstaller ? `/(field)/install/${selFarm.id}` : `/(field)/farm/${selFarm.id}`) as never)} full />
        </>
      ) : (
        <Txt variant="caption">Tap a pin to see the farm.</Txt>
      )}
    </Screen>
  );
}
