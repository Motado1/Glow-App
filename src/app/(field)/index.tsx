import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { FarmCard } from '@/components/FarmCard';
import { GlowLockup } from '@/components/brand/GlowLogo';
import { Header } from '@/components/Header';
import { SignOutButton } from '@/components/SignOutButton';
import { SyncChip } from '@/components/SyncChip';
import { Button, Card, Divider, EmptyState, Row, Screen, Spacer, Stat, StatGrid, Txt } from '@/components/ui';
import { repo } from '@/data';
import { isBoxInstallDone, isFieldBlocked, isPreInstallDone } from '@/domain/status';
import type { Farm } from '@/domain/types';
import { optimizeRoute } from '@/features/routing/optimizeRoute';
import { resolveStart } from '@/features/routing/startPoint';
import { formatDuration, formatMiles } from '@/lib/geo';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { useRouteStartStore } from '@/stores/routeStartStore';
import { colors, spacing } from '@/theme';

export default function Today() {
  const user = useCurrentUser();
  const { data: farms } = useRepoQuery(() => (user ? repo.listFarms({ assignedTo: user.id }) : Promise.resolve([])), [user?.id], ['farms']);
  const [offline, setOffline] = useState(false);
  const startMode = useRouteStartStore((s) => s.mode);

  const mine = farms ?? [];
  const total = mine.length;
  const completed = mine.filter((f) => isPreInstallDone(f.preInstallStatus)).length;
  const remaining = total - completed;
  // Blocked farms (locked gate, bad address…) drop out of the route so the
  // photographer isn't sent back to a farm they already reported.
  const active = useMemo(
    () => mine.filter((f) => !isPreInstallDone(f.preInstallStatus) && !isFieldBlocked(f.preInstallStatus)),
    [mine],
  );
  const primaryState = mine[0]?.state ?? 'Your';
  const start = useMemo(() => resolveStart(startMode, active), [startMode, active]);
  const route = useMemo(() => optimizeRoute(active, start.point), [active, start.point]);
  const firstFarm = route.stops[0] ? mine.find((f) => f.id === route.stops[0].farmId) : undefined;

  if (user?.role === 'installer') {
    return <InstallerToday name={user?.name} state={primaryState} farms={mine} />;
  }

  return (
    <Screen scroll>
      <View style={{ marginBottom: spacing.lg }}>
        <GlowLockup height={22} />
      </View>
      <Header
        title={`${primaryState} Assignment`}
        subtitle={user?.name}
        right={<Row gap={spacing.sm}><SyncChip /><SignOutButton /></Row>}
      />

      {total === 0 ? (
        <EmptyState icon="🎉" title="No farms assigned" subtitle="You're all caught up — check back later." />
      ) : (
        <>
          <StatGrid>
            <Stat label="Total farms" value={total} />
            <Stat label="Completed" value={completed} tone="success" />
            <Stat label="Remaining" value={remaining} tone="progress" />
            <Stat label="Driving today" value={formatMiles(route.totalMiles)} tone="info" />
          </StatGrid>

          <Spacer />
          <Card>
            <Txt variant="label">First stop</Txt>
            <Txt variant="subtitle">{firstFarm?.name ?? '—'}</Txt>
            {firstFarm ? <Txt variant="caption">{firstFarm.address}</Txt> : null}
            <Txt variant="caption">
              Starting from {start.label} · ≈ {formatMiles(route.totalMiles)} ·{' '}
              {formatDuration(route.totalMinutes)} total driving
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
          <Txt variant="heading">Your farms</Txt>
          <Spacer size={spacing.sm} />
          {route.stops.slice(0, 8).map((s) => {
            const f = mine.find((x) => x.id === s.farmId);
            return f ? <FarmCard key={f.id} farm={f} audience="field" onPress={() => router.push(`/(field)/farm/${f.id}` as never)} /> : null;
          })}
          {route.stops.length > 8 ? (
            <Txt variant="label" color={colors.brand} onPress={() => router.push('/(field)/farms')}>
              View all {total} farms →
            </Txt>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function InstallerToday({ name, state, farms }: { name?: string; state: string; farms: Farm[] }) {
  const total = farms.length;
  const complete = farms.filter((f) => isBoxInstallDone(f.boxInstallStatus)).length;
  const remaining = total - complete;
  const rework = farms.filter(
    (f) => f.boxInstallStatus === 'connectivity_failed' || f.boxInstallStatus === 'correction_required',
  ).length;
  const todo = farms.filter((f) => !isBoxInstallDone(f.boxInstallStatus));

  return (
    <Screen scroll>
      <Header
        title={`${state} Installations`}
        subtitle={name}
        right={<Row gap={spacing.sm}><SyncChip /><SignOutButton /></Row>}
      />
      {total === 0 ? (
        <EmptyState icon="🎉" title="No installations assigned" subtitle="You're all caught up — check back later." />
      ) : (
        <>
          <StatGrid>
            <Stat label="Assigned" value={total} />
            <Stat label="Complete" value={complete} tone="success" />
            <Stat label="Remaining" value={remaining} tone="progress" />
            <Stat label="Needs rework" value={rework} tone={rework ? 'warning' : 'neutral'} />
          </StatGrid>
          <Divider />
          <Txt variant="heading">To install</Txt>
          <Spacer size={spacing.sm} />
          {todo.length === 0 ? (
            <EmptyState icon="✅" title="All installed" subtitle="Every assigned box is complete." />
          ) : (
            todo.map((f) => (
              <FarmCard key={f.id} farm={f} phase="box_install" audience="field" onPress={() => router.push(`/(field)/install/${f.id}` as never)} />
            ))
          )}
        </>
      )}
    </Screen>
  );
}
