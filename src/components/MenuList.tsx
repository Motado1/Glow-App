import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlowIcon, type IconName } from '@/components/brand/GlowIcon';
import { Badge, Row, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export interface MenuItem {
  icon: IconName;
  label: string;
  /** One line on what's behind the row, so nothing is a mystery box. */
  detail?: string;
  href?: string;
  onPress?: () => void;
  /** A count worth surfacing before the row is tapped. */
  badge?: number;
}

/**
 * A list of destinations, set as hairline rows rather than a stack of cards —
 * the same treatment as the People roster, so the two read as one system.
 */
export function MenuList({ items }: { items: MenuItem[] }) {
  return (
    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong }}>
      {items.map((it) => (
        <Pressable
          key={it.label}
          onPress={it.onPress ?? (it.href ? () => router.push(it.href as never) : undefined)}
          style={({ pressed }) => [
            {
              paddingVertical: spacing.md,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            },
            pressed ? { opacity: 0.6 } : null,
          ]}
        >
          <Row gap={spacing.md}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: radius.sm,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GlowIcon name={it.icon} size={17} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="subtitle">{it.label}</Txt>
              {it.detail ? <Txt variant="caption">{it.detail}</Txt> : null}
            </View>
            {it.badge ? <Badge label={String(it.badge)} tone="info" /> : null}
            <GlowIcon name="chevron-right" size={15} color={colors.textFaint} />
          </Row>
        </Pressable>
      ))}
    </View>
  );
}
