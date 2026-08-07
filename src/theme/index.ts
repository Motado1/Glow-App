/**
 * Glow design tokens.
 *
 * Colours are taken verbatim from the Glow brand guidelines (May 2025):
 * a monochrome core (black / white / two greys) with orange as an accent
 * *only*, plus the pastel brand gradients for large hero surfaces.
 *
 * Deliberately framework-free (no NativeWind) so the same tokens drive
 * StyleSheet primitives reliably on iOS, Android, and web.
 */

/** Brand palette, exactly as published. */
export const brandPalette = {
  black: '#050505',
  white: '#FFFFFF',
  mediumGrey: '#F3F3F3',
  lightGrey: '#FAFAFA',
  /** Accent only — used for UI emphasis, never as a background wash. */
  orange: '#FFB472',
} as const;

/** Brand gradient stops (from the official gradient SVGs). */
export const gradientStops = {
  yellow: '#F7FCC4',
  mint: '#CCFFD4',
  lavender: '#DCC4FF',
} as const;

/**
 * The four published gradients. Rendered at the brand's diagonal
 * (the source SVGs run roughly top-left → bottom-right at ~37°).
 */
export const gradients = {
  full: [gradientStops.yellow, gradientStops.mint, gradientStops.lavender],
  a: [gradientStops.mint, gradientStops.lavender],
  b: [gradientStops.yellow, gradientStops.mint],
  c: [gradientStops.lavender, gradientStops.yellow],
} as const;

/** Matches the source SVG's gradient vector. */
export const gradientDirection = { start: { x: 0.1, y: 0 }, end: { x: 0.9, y: 1 } };
/** Colour stop positions for `gradients.full`. */
export const gradientFullLocations = [0, 0.337, 1];

export const colors = {
  // ---- Brand ----
  brand: brandPalette.black,
  brandSoft: '#2E2E2E',
  brandFaint: brandPalette.mediumGrey,
  accent: brandPalette.orange,
  accentSoft: '#FFE3C9',

  // ---- Surfaces ----
  bg: brandPalette.lightGrey,
  surface: brandPalette.white,
  surfaceAlt: brandPalette.mediumGrey,
  border: '#E7E7E7',
  borderStrong: '#D6D6D6',

  // ---- Text ----
  text: brandPalette.black,
  textMuted: '#5A5A5A',
  textFaint: '#8C8C8C',
  textInverse: brandPalette.white,

  // ---- Semantic status tones ----
  // Functional, not brand colours, so they stay legible — but desaturated to
  // sit comfortably next to the brand's soft pastels.
  neutralBg: '#EFEFEF',
  neutralText: '#5A5A5A',
  infoBg: '#E9EEF6',
  infoText: '#3C5878',
  progressBg: '#EAF0FA',
  progressText: '#3A5BD0',
  warningBg: '#FFF0DF',
  warningText: '#A05A15',
  dangerBg: '#FBE7E7',
  dangerText: '#B32D2D',
  successBg: '#E4F4EA',
  successText: '#1B7A3D',

  overlay: 'rgba(5, 5, 5, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '600',
  bold: '700',
} as const;

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'progress'
  | 'warning'
  | 'danger'
  | 'success';

export const toneColors: Record<StatusTone, { bg: string; text: string }> = {
  neutral: { bg: colors.neutralBg, text: colors.neutralText },
  info: { bg: colors.infoBg, text: colors.infoText },
  progress: { bg: colors.progressBg, text: colors.progressText },
  warning: { bg: colors.warningBg, text: colors.warningText },
  danger: { bg: colors.dangerBg, text: colors.dangerText },
  success: { bg: colors.successBg, text: colors.successText },
};

export const theme = { colors, spacing, radius, fontSize, fontWeight, toneColors, gradients };
export type Theme = typeof theme;
