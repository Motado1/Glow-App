/**
 * Central design tokens for the Glow Field Operations app.
 *
 * Deliberately framework-free (no NativeWind) so the same tokens drive
 * StyleSheet primitives reliably on iOS, Android, and web. Keep all colour,
 * spacing, radius, and type decisions here so screens stay consistent.
 */

export const colors = {
  // Brand — Glow is solar + agriculture: deep field green with a solar "glow" amber.
  brand: '#0B3D2E',
  brandSoft: '#12704F',
  brandFaint: '#E7F1EC',
  accent: '#F2A900',
  accentSoft: '#FFE3A3',

  // Surfaces
  bg: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceAlt: '#EFF3F0',
  border: '#DDE6E0',
  borderStrong: '#C6D3CB',

  // Text
  text: '#13211B',
  textMuted: '#5C6B63',
  textFaint: '#8A968F',
  textInverse: '#FFFFFF',

  // Semantic tones (used by StatusPill + Badge)
  neutralBg: '#EAEEEB',
  neutralText: '#4E5C55',
  infoBg: '#E6F0FA',
  infoText: '#1C6BB0',
  progressBg: '#E7EEFB',
  progressText: '#3A5BD0',
  warningBg: '#FBF0DA',
  warningText: '#9A6400',
  dangerBg: '#FBE7E7',
  dangerText: '#B62B2B',
  successBg: '#E4F4EA',
  successText: '#1B7A3D',

  overlay: 'rgba(9, 24, 18, 0.45)',
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

export const theme = { colors, spacing, radius, fontSize, fontWeight, toneColors };
export type Theme = typeof theme;
