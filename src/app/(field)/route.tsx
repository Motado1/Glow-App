import { router } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Header } from '@/components/Header';
import { Button, Card, Divider, EmptyState, Row, Screen, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import type { GeoPoint } from '@/domain/types';
import { buildAppleMapsDestUrl, buildGoogleMapsDestUrl, buildGoogleMapsRouteUrl } from '@/features/routing/mapsLinks';
import { optimizeRoute } from '@/features/routing/optimizeRoute';
import { formatDuration, formatMiles } from '@/lib/geo';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, spacing } from '@/theme';

const DONE = ['approved', 'complete'];
const DEFAULT_START: GeoPoint = { lat: 39.74, lng: -104.99 };

export default function RouteScreen() {
  const user = useCurrentUser();
  const { data: farms } = useRepoQuery(() => (user ? repo.listFarms({ assignedTo: user.id }) : Promise.resolve([])), [user?.id], ['farms']);
  const active = (farms ?? []).filter((f) => !DONE.includes(f.preInstallStatus));
  const start = active.find((f) => f.location)?.location ?? DEFAULT_START;
  const route = useMemo(() => optimizeRoute(active, start), [active, start]);
  const farmById = (id: string) => active.find((f) => f.id === id);

  function openStop(pt: GeoPoint, label: string) {
    const url = Platform.OS === 'ios' ? buildAppleMapsDestUrl(pt, label) : buildGoogleMapsDestUrl(pt);
    Linking.openURL(url).catch(() => {});
  }
  function openFull() {
    Linking.openURL(buildGoogleMapsRouteUrl(route.stops.map((s) => s.location), start)).catch(() => {});
  }

  return (
    <Screen scroll>
      <Header
        title="Optimized route"
        subtitle={`${route.stops.length} stops · ${formatMiles(route.totalMiles)} · ${formatDuration(route.totalMinutes)}`}
        onBack={() => router.back()}
      />
      {route.stops.length === 0 ? (
        <EmptyState icon="🧭" title="No stops" subtitle="Nothing to route right now." />
      ) : (
        <>
          <Button title="Open full route in Google Maps" icon="🗺️" onPress={openFull} full />
          <Spacer />
          {route.stops.map((s) => {
            const f = farmById(s.farmId);
            return (
              <Card key={s.farmId} style={{ marginBottom: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle">
                    {s.order}. {f?.name ?? s.glowFarmId}
                  </Txt>
                  <Txt variant="caption">{f?.address}</Txt>
                  <Txt variant="caption">
                    Leg: {formatMiles(s.legMiles)} · {formatDuration(s.legMinutes)}
                  </Txt>
                </View>
                <Spacer size={spacing.sm} />
                <Row gap={spacing.sm}>
                  <Button small title="Navigate" icon="🧭" onPress={() => openStop(s.location, f?.name ?? '')} />
                  <Button small variant="secondary" title="Open farm" onPress={() => router.push(`/(field)/farm/${s.farmId}` as never)} />
                </Row>
              </Card>
            );
          })}
          {route.skipped.length > 0 ? (
            <>
              <Divider />
              <Txt variant="caption" color={colors.warningText}>
                {route.skipped.length} farm(s) skipped (missing coordinates): {route.skipped.map((s) => s.glowFarmId).join(', ')}
              </Txt>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
