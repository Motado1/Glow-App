/**
 * Reusable StyleSheet primitives — the app's design system. No external UI or
 * icon library (emoji + simple shapes) so it renders identically on iOS,
 * Android, and web with zero config risk.
 */
import { Children, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  TextInput,
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  overlineStyle,
  radius,
  spacing,
  toneColors,
  type StatusTone,
} from '@/theme';

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

type TxtVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subtitle'
  | 'body'
  | 'label'
  | 'caption'
  /** Uppercase, letterspaced micro-label — glow.org's section marker. */
  | 'overline'
  /** Data readout: IDs, serials, coordinates. */
  | 'mono';

// Large type is set light and tight, the way the site sets its headings;
// small type stays at readable app density rather than marketing scale.
const TXT: Record<TxtVariant, TextStyle> = {
  display: { fontFamily: fontFamily.sansBold, fontSize: fontSize.xxl, letterSpacing: -0.8, lineHeight: fontSize.xxl * 1.15, color: colors.text },
  title: { fontFamily: fontFamily.sansSemibold, fontSize: fontSize.xl, letterSpacing: -0.5, lineHeight: fontSize.xl * 1.2, color: colors.text },
  heading: { fontFamily: fontFamily.sansSemibold, fontSize: fontSize.lg, letterSpacing: -0.3, lineHeight: fontSize.lg * 1.3, color: colors.text },
  subtitle: { fontFamily: fontFamily.sansMedium, fontSize: fontSize.md, lineHeight: fontSize.md * 1.4, color: colors.text },
  body: { fontFamily: fontFamily.sans, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5, color: colors.text },
  label: { fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4, color: colors.textMuted },
  caption: { fontFamily: fontFamily.sans, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4, color: colors.textFaint },
  overline: overlineStyle,
  mono: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, letterSpacing: 0.2, color: colors.text },
};

export function Txt({
  children,
  variant = 'body',
  color,
  weight,
  align,
  numberOfLines,
  onPress,
  style,
}: {
  children: ReactNode;
  variant?: TxtVariant;
  color?: string;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  onPress?: () => void;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      onPress={onPress}
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
  // NOTE: the styled node must be the OUTERMOST element in both branches. When
  // `style` was applied to an inner View, a pressable Card became a layout-less
  // flex child — which is why clickable stat tiles never matched the width of
  // non-clickable ones.
  const base: StyleProp<ViewStyle> = [styles.card, padded && { padding: spacing.lg }, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [base, pressed ? { opacity: 0.85 } : null]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
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

/* -------------------------------- StatGrid ------------------------------- */

/**
 * Equal-width tile grid. Each cell gets a percentage `flexBasis` AND a matching
 * `maxWidth` — the maxWidth is what stops a lone tile on the last line from
 * stretching to full width (a plain `flex:1` wrapping row does exactly that).
 * `alignItems: 'stretch'` makes tiles on the same line share a height.
 */
export function StatGrid({ children, gap = spacing.sm }: { children: ReactNode; gap?: number }) {
  const { width } = useWindowDimensions();
  const cols = width >= 1000 ? 4 : width >= 700 ? 3 : 2;
  const basis = cols === 4 ? '23.5%' : cols === 3 ? '32%' : '48.5%';
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'stretch' }}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={{ flexGrow: 1, flexBasis: basis, maxWidth: basis, minWidth: 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/* --------------------------------- Stat --------------------------------- */

export function Stat({ label, value, tone, onPress }: { label: string; value: string | number; tone?: StatusTone; onPress?: () => void }) {
  const c = tone ? toneColors[tone] : null;
  return (
    <Card onPress={onPress} style={[styles.stat, c ? { borderLeftWidth: 3, borderLeftColor: c.text } : null]}>
      <Text style={styles.statValue}>{value}</Text>
      <Txt variant="overline" numberOfLines={2}>
        {label}
      </Txt>
    </Card>
  );
}

/* -------------------------------- styles -------------------------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  // Surfaces are separated by a soft grey fill rather than an outline, the way
  // glow.org blocks out its sections.
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
  },
  btn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontFamily: fontFamily.sansSemibold, fontSize: fontSize.md, letterSpacing: -0.1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start' },
  badgeText: { fontFamily: fontFamily.sansMedium, fontSize: fontSize.xs, letterSpacing: 0.2 },
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
  pillText: { fontFamily: fontFamily.sansMedium, fontSize: fontSize.xs, letterSpacing: 0.2 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.text,
  },
  segment: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  segmentText: { fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: 2 },
  // No minWidth: it would fight StatGrid's percentage maxWidth. flex:1 makes
  // the card fill its grid cell's height.
  stat: { flex: 1, gap: 2 },
  statValue: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.xxl,
    letterSpacing: -1,
    color: colors.brand,
  },
});
