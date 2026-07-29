import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Field, Row, Spacer, Txt } from '@/components/ui';
import type { Farm } from '@/domain/types';
import { geocodeAddress } from '@/features/geo/geocode';
import { getCurrentPoint } from '@/features/routing/currentLocation';
import type { ResolvedStart } from '@/features/routing/startPoint';
import { parseCoordinates } from '@/lib/geo';
import { useRouteStartStore } from '@/stores/routeStartStore';
import { colors, spacing } from '@/theme';

type Panel = 'none' | 'farm' | 'manual';

/**
 * Lets the worker choose where the route starts: device GPS, one of their
 * farms, or a typed address / coordinates (which is how this works on a
 * computer, where there's no useful GPS).
 */
export function RouteStartPicker({ farms, start }: { farms: Farm[]; start: ResolvedStart }) {
  const setMode = useRouteStartStore((s) => s.setMode);
  const [panel, setPanel] = useState<Panel>('none');
  const [locating, setLocating] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const withCoords = farms.filter((f) => f.location);

  async function useMyLocation() {
    setNote(null);
    setLocating(true);
    const r = await getCurrentPoint();
    setLocating(false);
    if (r.ok) {
      setMode({ kind: 'current', point: r.point });
      setPanel('none');
    } else {
      setNote(r.message);
    }
  }

  async function applyTyped() {
    const raw = text.trim();
    if (!raw) return;
    setNote(null);
    // Coordinates first — instant and offline-safe.
    const coords = parseCoordinates(raw);
    if (coords) {
      setMode({ kind: 'manual', point: coords, label: raw });
      setPanel('none');
      setText('');
      return;
    }
    setBusy(true);
    const found = await geocodeAddress(raw);
    setBusy(false);
    if (found) {
      setMode({ kind: 'manual', point: found, label: raw });
      setPanel('none');
      setText('');
    } else {
      setNote("Couldn't find that address. Try adding the city and state, or paste coordinates.");
    }
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Txt variant="label">Starting from</Txt>
      <Txt variant="subtitle" numberOfLines={1}>
        {start.label}
      </Txt>
      <Spacer size={spacing.sm} />
      <Row gap={spacing.sm} wrap>
        <Button small title="Use my location" icon="📍" loading={locating} onPress={useMyLocation} />
        <Button
          small
          variant="secondary"
          title="Start at a farm"
          icon="🌾"
          onPress={() => setPanel(panel === 'farm' ? 'none' : 'farm')}
        />
        <Button
          small
          variant="secondary"
          title="Enter address"
          icon="✏️"
          onPress={() => setPanel(panel === 'manual' ? 'none' : 'manual')}
        />
      </Row>

      {note ? (
        <Txt variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          {note}
        </Txt>
      ) : null}

      {panel === 'farm' ? (
        <View style={{ marginTop: spacing.sm }}>
          {withCoords.length === 0 ? (
            <Txt variant="caption">None of your farms have coordinates yet.</Txt>
          ) : (
            withCoords.slice(0, 12).map((f) => (
              <Txt
                key={f.id}
                variant="body"
                color={colors.brand}
                numberOfLines={1}
                style={{ paddingVertical: 6 }}
                onPress={() => {
                  setMode({ kind: 'farm', farmId: f.id });
                  setPanel('none');
                }}
              >
                🌾 {f.name}
              </Txt>
            ))
          )}
        </View>
      ) : null}

      {panel === 'manual' ? (
        <View style={{ marginTop: spacing.sm }}>
          <Field
            label="Address or coordinates"
            value={text}
            onChangeText={setText}
            placeholder="1200 Main St, Denver CO — or 39.74, -104.99"
            autoCapitalize="words"
          />
          <Spacer size={spacing.sm} />
          <Button small title="Set as start" icon="✓" loading={busy} onPress={applyTyped} />
        </View>
      ) : null}
    </Card>
  );
}
