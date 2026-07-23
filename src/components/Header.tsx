import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Row, Txt } from '@/components/ui';
import { colors, spacing } from '@/theme';

/** Custom screen header (we run headerShown:false and render our own). */
export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <Row justify="space-between" align="flex-start" style={{ marginBottom: spacing.md }} gap={spacing.sm}>
      <Row gap={spacing.sm} align="center" style={{ flex: 1 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={{ paddingRight: 2 }}>
            <Txt variant="title" color={colors.brand}>
              ‹
            </Txt>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Txt variant="title" numberOfLines={1}>
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
  );
}
