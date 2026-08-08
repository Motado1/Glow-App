/**
 * The Glow icon set.
 *
 * Drawn, not borrowed. Every glyph lives on a 24×24 grid, is stroked at 1.75
 * with **square caps and mitre joins**, and contains **no curves** — because the
 * Glow symbol contains no curves. Its eight petals are rhombi struck at 45°, so
 * that rhombus is the recurring device here: it's the camera's lens, the clock's
 * face, the pin's head, the key's bow, the settings handles, the sun at the
 * centre of `today`, and the field in `farms`.
 *
 * Silhouettes stay conventional on purpose. A camera still reads as a camera at
 * arm's length in sunlight — the brand shows up in how each shape is
 * constructed, not by replacing forms people already know.
 *
 * These replace the emoji the app used to render as iconography, which drew a
 * different picture on every platform.
 */
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * Mark a path as solid. Arrowheads and status dots have to read as a mass —
 * two stroked barbs meeting at a point turn to mush below about 20px.
 */
function F(d: string) {
  return { d, fill: true } as const;
}

type IconPath = string | { readonly d: string; readonly fill: true };

// `satisfies`, not an annotation: the value shape is checked but the keys stay
// literal, so `IconName` is a union and a bad icon name is a compile error.
const ICONS = {
  /* ------------------------------- Tabs ------------------------------- */

  // Bars on a baseline.
  dashboard: ['M2.8 20.4 H21.2', 'M6.8 20.4 V13', 'M12 20.4 V5.6', 'M17.2 20.4 V9.6'],

  // A plot of land in perspective — the Glow petal — with two furrows.
  farms: ['M12 5 L21 12 L12 19 L3 12 Z', 'M6 14.3 L15 7.3', 'M9 16.7 L18 9.7'],

  // One source fanning out to two people. (Distinct from `navigate`, which the
  // old 🧭 was doing double duty for.)
  assign: [
    'M5 10.2 L6.8 12 L5 13.8 L3.2 12 Z',
    'M6.8 12 H10 L13.8 8.2 H15.4',
    'M10 12 L13.8 15.8 H15.4',
    'M18 6.4 L19.8 8.2 L18 10 L16.2 8.2 Z',
    'M18 14 L19.8 15.8 L18 17.6 L16.2 15.8 Z',
  ],

  // A check struck inside the petal.
  review: ['M12 2.6 L21.4 12 L12 21.4 L2.6 12 Z', 'M7.8 12 L10.8 15 L16.2 8.6'],

  more: ['M4 7.4 H20', 'M4 12 H20', 'M4 16.6 H20'],

  // The Glow symbol's radiating geometry, reduced to a sun.
  today: [
    'M12 8 L16 12 L12 16 L8 12 Z',
    'M12 2.6 V5.2',
    'M12 18.8 V21.4',
    'M2.6 12 H5.2',
    'M18.8 12 H21.4',
    'M5.3 5.3 L7.2 7.2',
    'M18.7 5.3 L16.8 7.2',
    'M5.3 18.7 L7.2 16.8',
    'M18.7 18.7 L16.8 16.8',
  ],

  map: ['M3 6.4 L9 4.4 L15 6.4 L21 4.4 V17.6 L15 19.6 L9 17.6 L3 19.6 Z', 'M9 4.4 V17.6', 'M15 6.4 V19.6'],

  alerts: [
    'M6.6 17.2 V12 L8.1 8.6 L10.6 6.6 H13.4 L15.9 8.6 L17.4 12 V17.2',
    'M4 17.2 H20',
    'M9.9 20.2 H14.1',
    'M12 4 V6.6',
  ],

  /* ------------------------------ Actions ----------------------------- */

  // Rhombus lens.
  camera: [
    'M2.6 8 H8.2 L9.8 5.4 H14.2 L15.8 8 H21.4 V19.4 H2.6 Z',
    'M12 9.6 L15.4 13.6 L12 17.6 L8.6 13.6 Z',
  ],
  scan: ['M3 8.6 V4.6 H7', 'M17 4.6 H21 V8.6', 'M21 15.4 V19.4 H17', 'M7 19.4 H3 V15.4', 'M6 12 H18'],
  image: [
    'M3.2 5 H20.8 V19 H3.2 Z',
    'M5.4 16.6 L10 10.6 L13.6 15 L16.2 12 L18.8 16.6',
    'M16.6 7 L18.2 8.6 L16.6 10.2 L15 8.6 Z',
  ],
  navigate: ['M21 3 L3 10.4 L11.2 12.8 L13.6 21 Z', 'M11.2 12.8 L21 3'],
  upload: ['M12 13.4 V3.6', 'M7.8 7.8 L12 3.6 L16.2 7.8', 'M3.6 15 V20.4 H20.4 V15'],
  download: ['M12 3.6 V13.4', 'M7.8 9.2 L12 13.4 L16.2 9.2', 'M3.6 15 V20.4 H20.4 V15'],
  save: ['M3.6 3.6 H17 L20.4 7 V20.4 H3.6 Z', 'M8 3.6 V9 H16 V3.6', 'M7 20.4 V14 H17 V20.4'],
  file: ['M5.4 2.6 H14 L19 7.6 V21.4 H5.4 Z', 'M14 2.6 V7.6 H19', 'M8.8 12.6 H15.6', 'M8.8 16.6 H15.6'],
  folder: ['M2.8 5.6 H9.6 L11.8 8.2 H21.2 V19.4 H2.8 Z'],
  // A rotation drawn as three-quarters of the petal, with the head on the return.
  reset: ['M12 4.6 L19.4 12 L12 19.4 L4.6 12 L7.1 9.5', F('M9.8 6.8 L8.7 11.1 L5.6 7.9 Z')],
  // The same rotation the other way — retake sends work back.
  retake: ['M12 4.6 L4.6 12 L12 19.4 L19.4 12 L16.9 9.5', F('M14.2 6.8 L15.3 11.1 L18.4 7.9 Z')],
  signout: ['M12.6 3.6 H4.6 V20.4 H12.6', 'M9.4 12 H20.4', 'M16.6 8.2 L20.4 12 L16.6 15.8'],
  phone: ['M7 2.6 H17 V21.4 H7 Z', 'M10 5.6 H14', 'M10.4 18.4 H13.6'],
  message: ['M3.4 4.6 H20.6 V15.6 H12.2 L7.6 20.2 V15.6 H3.4 Z'],
  // Rhombus head, rhombus aperture.
  pin: ['M12 21.6 L6.2 10 L12 2.8 L17.8 10 Z', 'M12 6.6 L14.4 9.6 L12 12.6 L9.6 9.6 Z'],
  bolt: ['M13.6 2.6 L5 13.4 H11.2 L10.4 21.4 L19 10.6 H12.8 Z'],
  key: ['M9 8 L12.6 11.6 L9 15.2 L5.4 11.6 Z', 'M12.6 11.6 H21', 'M18 11.6 V15', 'M15 11.6 V14.2'],
  alert: ['M12 3.4 L22.2 20.6 H1.8 Z', 'M12 9.8 V14.6', 'M12 17.2 V18.4'],
  hold: ['M9 5.4 V18.6', 'M15 5.4 V18.6'],
  edit: ['M3.6 20.4 L5.2 15.4 L15.8 4.8 L19.2 8.2 L8.6 18.8 Z', 'M13.4 7.2 L16.8 10.6'],
  // Rails with rhombus handles.
  settings: [
    'M3.4 6.6 H20.6',
    'M3.4 12 H20.6',
    'M3.4 17.4 H20.6',
    'M8 4.8 L9.8 6.6 L8 8.4 L6.2 6.6 Z',
    'M15 10.2 L16.8 12 L15 13.8 L13.2 12 Z',
    'M10.5 15.6 L12.3 17.4 L10.5 19.2 L8.7 17.4 Z',
  ],
  // Isometric cube — three rhombi, which is the symbol's own construction.
  box: ['M12 2.6 L21 7.8 V16.2 L12 21.4 L3 16.2 V7.8 Z', 'M3 7.8 L12 13 L21 7.8', 'M12 13 V21.4'],

  /* ------------------------------- State ------------------------------ */

  check: ['M4.6 12.4 L9.6 17.4 L19.4 6.6'],
  cross: ['M5.6 5.6 L18.4 18.4', 'M18.4 5.6 L5.6 18.4'],
  dash: ['M5 12 H19'],
  'checkbox-off': ['M3.6 3.6 H20.4 V20.4 H3.6 Z'],
  'checkbox-on': ['M3.6 3.6 H20.4 V20.4 H3.6 Z', 'M7.6 12 L10.9 15.3 L16.6 8.8'],
  'chevron-right': ['M9 4.6 L16.4 12 L9 19.4'],
  'chevron-left': ['M15 4.6 L7.6 12 L15 19.4'],
  'chevron-down': ['M5 8.8 L12 15.8 L19 8.8'],
  'arrow-right': ['M3.5 12 H20.5', 'M14 5.5 L20.5 12 L14 18.5'],
  user: ['M12 3.2 L15.2 6.6 L12 10 L8.8 6.6 Z', 'M4.8 20.6 L6.9 13.8 H17.1 L19.2 20.6'],
  calendar: ['M3.6 5.4 H20.4 V20.4 H3.6 Z', 'M3.6 10 H20.4', 'M8 3 V7.6', 'M16 3 V7.6'],
  clock: ['M12 2.8 L21.2 12 L12 21.2 L2.8 12 Z', 'M12 7 V12 H15.8'],
  /** Solid petal — status dots and list bullets. */
  diamond: [F('M12 5 L19 12 L12 19 L5 12 Z')],
} satisfies Record<string, readonly IconPath[]>;

export type IconName = keyof typeof ICONS;

export function GlowIcon({
  name,
  size = 20,
  color = colors.text,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /** Only override for very large or very small renderings. */
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICONS[name].map((p, i) => {
        const solid = typeof p !== 'string';
        return (
          <Path
            key={i}
            d={typeof p === 'string' ? p : p.d}
            fill={solid ? color : 'none'}
            stroke={color}
            strokeWidth={solid ? 1 : strokeWidth}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      })}
    </Svg>
  );
}
