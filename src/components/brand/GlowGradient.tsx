/**
 * The Glow brand gradients, reproduced from the official gradient SVGs
 * (stops and diagonal direction taken verbatim).
 *
 * Reserved for large hero surfaces — login, splash, section headers — the way
 * the brand guide uses them. Never behind body copy.
 */
import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import type { StyleProp, ViewStyle } from 'react-native';
import { gradientDirection, gradientFullLocations, gradients } from '@/theme';

type GradientName = keyof typeof gradients;

export function GlowGradient({
  name = 'full',
  style,
  children,
}: {
  name?: GradientName;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const stops = gradients[name];
  return (
    <LinearGradient
      colors={stops as unknown as readonly [string, string, ...string[]]}
      locations={
        name === 'full'
          ? (gradientFullLocations as unknown as readonly [number, number, ...number[]])
          : undefined
      }
      start={gradientDirection.start}
      end={gradientDirection.end}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
