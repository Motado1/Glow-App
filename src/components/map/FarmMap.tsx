// Base + web implementation (Metro picks FarmMap.native.tsx on iOS/Android).
// Must NOT import react-native-maps (no web support) — that's the whole point
// of the platform split, policed by `expo export --platform web`.
import { FarmMapFallback } from './FarmMapFallback';
import type { FarmMapProps } from './FarmMap.types';

export function FarmMap(props: FarmMapProps) {
  return <FarmMapFallback {...props} />;
}
