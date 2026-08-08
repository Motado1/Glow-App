import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlowIcon } from '@/components/brand/GlowIcon';
import { Row, Txt } from '@/components/ui';
import { colors, spacing } from '@/theme';

/**
 * Custom screen header (we run headerShown:false and render our own).
 *
 * Set the way glow.org sets a section: a small uppercase eyebrow above the
 * headline, the headline in tight display type, then a hairline rule closing
 * the block. The eyebrow carries the context (which state, which phase) so the
 * headline can stay short.
 */
export function Header({
  eyebrow,
  title,
  subtitle,
  onBack,
  right,
  rule = true,
}: {
  /** Uppercase micro-label above the title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  /** Hairline under the block. Off for headers that sit on a tinted surface. */
  rule?: boolean;
}) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Row justify="space-between" align="flex-start" gap={spacing.sm}>
        <Row gap={spacing.sm} align="center" style={{ flex: 1 }}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={14} style={{ paddingRight: 2, paddingVertical: 4 }}>
              <GlowIcon name="chevron-left" size={20} color={colors.brand} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            {eyebrow ? <Txt variant="overline">{eyebrow}</Txt> : null}
            <Txt variant="title" numberOfLines={2}>
              {title}
            </Txt>
            {subtitle ? (
              <Txt variant="caption" numberOfLines={1}>
                {subtitle}
              </Txt>
            ) : null}
          </View>
        </Row>
        {right}
      </Row>
      {rule ? (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.borderStrong,
            marginTop: spacing.md,
          }}
        />
      ) : null}
    </View>
  );
}
