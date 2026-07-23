/**
 * Reusable StyleSheet primitives — the app's design system. No external UI or
 * icon library (emoji + simple shapes) so it renders identically on iOS,
 * Android, and web with zero config risk.
 */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  TextInput,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, radius, spacing, toneColors, type StatusTone } from '@/theme';

/* -------------------------------- Screen -------------------------------- */

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'left', 'right'],
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  const inner = padded ? { padding: spacing.lg } : undefined;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding: padded ? spacing.lg : 0, paddingBottom: spacing.xxxl }, style]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, inner, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/* --------------------------------- Text --------------------------------- */

type TxtVariant = 'display' | 'title' | 'heading' | 'subtitle' | 'body' | 'label' | 'caption';

const TXT: Record<TxtVariant, TextStyle> = {
  display: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textMuted },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.textFaint },
};

export function Txt({
  children,
  variant = 'body',
  color,
  weight,
  align,
  numberOfLines,
  style,
}: {
  children: ReactNode;
  variant?: TxtVariant;
  color?: string;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[TXT[variant], color ? { color } : null, weight ? { fontWeight: weight } : null, align ? { textAlign: align } : null, style]}
    >
      {children}
    </Text>
  );
}

/* --------------------------------- Row ---------------------------------- */

export function Row({
  children,
  gap = spacing.sm,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  style,
}: {
  children: ReactNode;
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: align, justifyContent: justify, gap, flexWrap: wrap ? 'wrap' : 'nowrap' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Spacer({ size = spacing.md }: { size?: number }) {
  return <View style={{ height: size }} />;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md }, style]} />;
}

/* --------------------------------- Card --------------------------------- */

export function Card({
  children,
  onPress,
  style,
  padded = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const content = <View style={[styles.card, padded && { padding: spacing.lg }, style]}>{children}</View>;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}>
        {content}
      </Pressable>
    );
  }
  return content;
}

/* -------------------------------- Button -------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  full = false,
  small = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  full?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg: Record<ButtonVariant, string> = {
    primary: colors.brand,
    secondary: colors.surfaceAlt,
    ghost: 'transparent',
    danger: colors.dangerText,
  };
  const fg: Record<ButtonVariant, string> = {
    primary: colors.textInverse,
    secondary: colors.text,
    ghost: colors.brand,
    danger: colors.textInverse,
  };
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        small && { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
        { backgroundColor: bg[variant] },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.borderStrong },
        full && { alignSelf: 'stretch' },
        isDisabled && { opacity: 0.45 },
        pressed && !isDisabled ? { opacity: 0.85 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <Text style={[styles.btnText, small && { fontSize: fontSize.sm }, { color: fg[variant] }]}>
          {icon ? `${icon}  ` : ''}
          {title}
        </Text>
      )}
    </Pressable>
  );
}

/* --------------------------- Badge / StatusPill ------------------------- */

export function Badge({ label, tone = 'neutral', style }: { label: string; tone?: StatusTone; style?: StyleProp<ViewStyle> }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.badgeText, { color: c.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.text }]} />
      <Text style={[styles.pillText, { color: c.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* -------------------------------- Field --------------------------------- */

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  keyboardType,
  multiline = false,
  secureTextEntry,
  autoFocus,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: 'default' | 'email-address' | 'numeric';
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Txt variant="label">{label}</Txt> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoFocus={autoFocus}
        style={[styles.input, multiline && { height: 96, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

/* -------------------------- SegmentedControl ---------------------------- */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <Row gap={spacing.xs} wrap>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active ? { backgroundColor: colors.brand } : { backgroundColor: colors.surfaceAlt }]}
          >
            <Text style={[styles.segmentText, { color: active ? colors.textInverse : colors.textMuted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

/* ------------------------------ EmptyState ------------------------------ */

export function EmptyState({ icon = '📭', title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>{icon}</Text>
      <Txt variant="heading" align="center">
        {title}
      </Txt>
      {subtitle ? (
        <Txt variant="body" color={colors.textMuted} align="center" style={{ marginTop: spacing.xs }}>
          {subtitle}
        </Txt>
      ) : null}
    </View>
  );
}

/* --------------------------------- Stat --------------------------------- */

export function Stat({ label, value, tone, onPress }: { label: string; value: string | number; tone?: StatusTone; onPress?: () => void }) {
  const c = tone ? toneColors[tone] : null;
  return (
    <Card onPress={onPress} style={[styles.stat, c ? { borderLeftWidth: 3, borderLeftColor: c.text } : null]}>
      <Text style={styles.statValue}>{value}</Text>
      <Txt variant="caption" numberOfLines={2}>
        {label}
      </Txt>
    </Card>
  );
}

/* -------------------------------- styles -------------------------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, alignSelf: 'flex-start' },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  segment: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  segmentText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: 2 },
  stat: { flex: 1, minWidth: 150, gap: 2 },
  statValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.brand },
});
