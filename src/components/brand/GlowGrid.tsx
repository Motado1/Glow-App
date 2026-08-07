/**
 * The Glow Grid graphic device (brand kit → 02_Graphic-Devices/02_Glow-Grid).
 *
 * The source SVG draws a 959×959 lattice as filled hairline rectangles at a
 * uniform ~79.9px pitch. Since it's a regular lattice, it's reproduced here
 * parametrically instead of embedding ~4.5 KB of equivalent path data — same
 * geometry, a fraction of the bundle, and it scales to any size.
 *
 * Intended as a low-opacity texture over the brand gradients, the way the
 * device is layered on glow.org — never as a foreground element.
 */
import Svg, { Line } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

const BOX = 959;
const CELLS = 12;
const PITCH = BOX / CELLS;

export function GlowGrid({
  color = colors.brand,
  opacity = 0.07,
  strokeWidth = 1.5,
}: {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
}) {
  const lines = Array.from({ length: CELLS + 1 }, (_, i) => i * PITCH);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${BOX} ${BOX}`} preserveAspectRatio="xMidYMid slice">
        {lines.map((p) => (
          <Line key={`v${p}`} x1={p} y1={0} x2={p} y2={BOX} stroke={color} strokeWidth={strokeWidth} opacity={opacity} />
        ))}
        {lines.map((p) => (
          <Line key={`h${p}`} x1={0} y1={p} x2={BOX} y2={p} stroke={color} strokeWidth={strokeWidth} opacity={opacity} />
        ))}
      </Svg>
    </View>
  );
}
