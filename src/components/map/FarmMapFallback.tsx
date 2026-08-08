import { ScrollView, View } from 'react-native';
import { GlowIcon } from '@/components/brand/GlowIcon';
import { IconLine, Row, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { FarmMapProps } from './FarmMap.types';

/**
 * Web / fallback map. react-native-maps has no web support, so on web (the
 * admin surface) we render a plotted-farms list instead. The interactive map
 * runs natively for field workers. List-first keeps a missing map from ever
 * blocking the app.
 */
export function FarmMapFallback({ markers, selectedId, onSelect, height = 300 }: FarmMapProps) {
  return (
    <View style={{ borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ height: 84, backgroundColor: colors.brandFaint, alignItems: 'center', justifyContent: 'center' }}>
        <IconLine icon="map" variant="subtitle" size={15} color={colors.text}>
          {markers.length} farms plotted
        </IconLine>
        <Txt variant="caption">Interactive map runs in the mobile app</Txt>
      </View>
      <ScrollView style={{ maxHeight: height }} contentContainerStyle={{ paddingBottom: spacing.sm }}>
        {markers.map((m, i) => {
          const active = m.id === selectedId;
          return (
            <View
              key={m.id}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderBottomWidth: StyleHair,
                borderBottomColor: colors.border,
                backgroundColor: active ? colors.brandFaint : colors.surface,
              }}
              onStartShouldSetResponder={() => {
                onSelect?.(m.id);
                return false;
              }}
            >
              <Row justify="space-between" gap={spacing.sm}>
                <Txt variant="body" numberOfLines={1} style={{ flex: 1 }}>
                  {i + 1}. {m.label}
                </Txt>
                <Txt variant="mono" color={colors.textFaint}>
                  {m.lat.toFixed(3)}, {m.lng.toFixed(3)}
                </Txt>
              </Row>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const StyleHair = 1;
