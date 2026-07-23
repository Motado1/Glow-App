import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FarmCard } from '@/components/FarmCard';
import { Header } from '@/components/Header';
import { SyncChip } from '@/components/SyncChip';
import { Button, Card, Divider, EmptyState, Row, Screen, Spacer, Stat, Txt } from '@/components/ui';
import { repo } from '@/data';
import { optimizeRoute } from '@/features/routing/optimizeRoute';
import type { GeoPoint } from '@/domain/types';
import { formatDuration, formatMiles } from '@/lib/geo';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, spacing } from '@/theme';

const DONE = ['approved', 'complete'];
const DEFAULT_START: GeoPoint = { lat: 39.74, lng: -104.99 };

export default function Today() {
  const user = useCurrentUser();
  const { data: farms } = useRepoQuery(() => (user ? repo.listFarms({ assignedTo: user.id }) : Promise.resolve([])), [user?.id], ['farms']);
  const [offline, setOffline] = useState(false);

  const mine = farms ?? [];
  const total = mine.length;
  const completed = mine.filter((f) => DONE.includes(f.preInstallStatus)).length;
  const remaining = total - completed;
  const active = useMemo(() => mine.filter((f) => !DONE.includes(f.preInstallStatus)), [mine]);
  const primaryState = mine[0]?.state ?? 'Your';
  const start = active.find((f) => f.location)?.location ?? DEFAULT_START;
  const route = useMemo(() => optimizeRoute(active, start), [active, start]);
  const recommended = route.stops.slice(0, 6);
  const firstFarm = recommended[0] ? mine.find((f) => f.id === recommended[0].farmId) : undefined;

  return (
    <Screen scroll>
      <Header title={`${primaryState} Assignment`} subtitle={user?.name} right={<SyncChip />} />

      {total === 0 ? (
        <EmptyState icon="🎉" title="No farms assigned" subtitle="You're all caught up — check back later." />
      ) : (
        <>
          <Row wrap gap={spacing.sm}>
            <Stat label="Total farms" value={total} />
            <Stat label="Completed" value={completed} tone="success" />
            <Stat label="Remaining" value={remaining} tone="progress" />
            <Stat label="Recommended today" value={recommended.length} tone="info" />
          </Row>

          <Spacer />
          <Card>
            <Txt variant="label">First stop</Txt>
            <Txt variant="subtitle">{firstFarm?.name ?? '—'}</Txt>
            {firstFarm ? <Txt variant="caption">{firstFarm.address}</Txt> : null}
            <Txt variant="caption">
              ≈ {formatMiles(route.totalMiles)} · {formatDuration(route.totalMinutes)} total driving
              {route.skipped.length ? ` · ${route.skipped.length} missing coordinates` : ''}
            </Txt>
            <Spacer size={spacing.sm} />
            <Row gap={spacing.sm}>
              <Button small title="Start route" icon="🧭" onPress={() => router.push('/(field)/route')} />
              <Button small variant="secondary" title="Map" icon="🗺️" onPress={() => router.push('/(field)/map')} />
            </Row>
          </Card>

          <Spacer />
          <Button
            title={offline ? '✓ Available offline' : '⬇️ Download assignment for offline'}
            variant="secondary"
            full
            onPress={() => setOffline(true)}
          />
          {offline ? (
            <Txt variant="caption" color={colors.successText} style={{ marginTop: spacing.xs }}>
              Farms, checklists, and addresses are cached on this device.
            </Txt>
          ) : null}

          <Divider />
          <Txt variant="heading">Recommended for today</Txt>
          <Spacer size={spacing.sm} />
          {recommended.map((s) => {
            const f = mine.find((x) => x.id === s.farmId);
            return f ? <FarmCard key={f.id} farm={f} onPress={() => router.push(`/(field)/farm/${f.id}` as never)} /> : null;
          })}
        </>
      )}
    </Screen>
  );
}
