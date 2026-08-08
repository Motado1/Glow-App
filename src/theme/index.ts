/**
 * Glow design tokens.
 *
 * Colours, gradient stops and type language follow the Glow brand guidelines
 * (May 2025) and the visual system on glow.org: a monochrome core with orange
 * as a UI accent only, pastel gradients on hero surfaces, uppercase
 * letterspaced micro-labels, and monospace for data readouts.
 *
 * Deliberately framework-free (no NativeWind) so the same tokens drive
 * StyleSheet primitives reliably on iOS, Android, and web.
 */
import { Platform, type TextStyle } from 'react-native';

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

/** The four published gradients, at the brand's diagonal. */
export const gradients = {
  full: [gradientStops.yellow, gradientStops.mint, gradientStops.lavender],
  a: [gradientStops.mint, gradientStops.lavender],
  b: [gradientStops.yellow, gradientStops.mint],
  c: [gradientStops.lavender, gradientStops.yellow],
} as const;

/** Matches the source SVG's gradient vector (~141°). */
export const gradientDirection = { start: { x: 0.1, y: 0 }, end: { x: 0.9, y: 1 } };
export const gradientFullLocations = [0, 0.337, 1];

export const colors = {
  // ---- Brand ----
  brand: brandPalette.black,
  brandSoft: '#2E2E2E',
  brandFaint: brandPalette.mediumGrey,
  accent: brandPalette.orange,
  accentSoft: '#FFE3C9',

  // ---- Surfaces ----
  bg: brandPalette.white,
  surface: brandPalette.white,
  /** Grey fill used to separate surfaces instead of borders. */
  surfaceAlt: brandPalette.lightGrey,
  surfaceSunken: brandPalette.mediumGrey,
  border: '#ECECEC',
  borderStrong: '#DCDCDC',

  // ---- Text ----
  text: brandPalette.black,
  textMuted: '#5A5A5A',
  textFaint: '#8C8C8C',
  textInverse: brandPalette.white,

  // ---- Semantic status tones ----
  // Functional, not brand colours — legible, but desaturated to sit
  // comfortably next to the brand's pastels.
  neutralBg: '#F0F0F0',
  neutralText: '#5A5A5A',
  infoBg: '#EAEFF6',
  infoText: '#3C5878',
  progressBg: '#EAF0FA',
  progressText: '#3A5BD0',
  warningBg: '#FFF1E2',
  warningText: '#9A5512',
  dangerBg: '#FCE9E9',
  dangerText: '#B32D2D',
  successBg: '#E6F3EB',
  successText: '#1B7A3D',

  overlay: 'rgba(5, 5, 5, 0.45)',
} as const;

/* ------------------------------ Typography ------------------------------ */

/**
 * The Glow brand faces are **Söhne** (Klim Type Foundry) for sans and
 * **Duplicate Slab** (e-Types) for the secondary serif. Both are commercially
 * licensed, so they can't be bundled here without Glow's licence files.
 *
 * Archivo is the stand-in. Söhne is drawn on Akzidenz-Grotesk bones; Archivo is
 * too, so it carries the same slightly-squared terminals and tight apertures —
 * where Inter (the obvious free grotesque, and the default on every generated
 * app) is a screen-first Helvetica descendant that reads as generic here.
 *
 * TO SWAP IN THE REAL FACE — two steps, nothing else changes:
 *   1. Drop Söhne .ttf/.otf into `assets/fonts/` and register them in the
 *      `useFonts({...})` call in `src/app/_layout.tsx`.
 *   2. Point the four `sans*` tokens below at those family names.
 *
 * Duplicate Slab is intentionally unused: glow.org sets its display copy in the
 * sans, so a slab serif here would be off-register for a data-dense tool.
 */
export const fontFamily = {
  sans: 'Archivo_400Regular',
  sansMedium: 'Archivo_500Medium',
  sansSemibold: 'Archivo_600SemiBold',
  sansBold: 'Archivo_700Bold',
  /** Data readouts (IDs, serials, coordinates) — as glow.org sets its hex values. */
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  }) as string,
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
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 19,
  xl: 24,
  xxl: 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '600',
  bold: '700',
} as const;

/**
 * Fixed-width digits. Applied to every figure that changes in place — dashboard
 * counts, progress readouts, route distances — so numbers don't shuffle
 * sideways as they update. Degrades to proportional figures where unsupported.
 */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

/** Signature site treatment: small, uppercase, widely letterspaced. */
export const overlineStyle: TextStyle = {
  fontFamily: fontFamily.sansSemibold,
  fontSize: fontSize.xs,
  letterSpacing: 1.1,
  textTransform: 'uppercase',
  color: colors.textMuted,
};

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

export const theme = { colors, spacing, radius, fontSize, fontWeight, fontFamily, toneColors, gradients };
export type Theme = typeof theme;
