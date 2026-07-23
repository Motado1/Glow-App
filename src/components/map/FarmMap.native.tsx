import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { radius } from '@/theme';
import type { FarmMapProps } from './FarmMap.types';

export function FarmMap({ markers, selectedId, onSelect, height = 340 }: FarmMapProps) {
  const first = markers[0];
  const region = first
    ? { latitude: first.lat, longitude: first.lng, latitudeDelta: 1.6, longitudeDelta: 1.6 }
    : undefined;
  return (
    <View style={{ height, borderRadius: radius.lg, overflow: 'hidden' }}>
      <MapView style={{ flex: 1 }} initialRegion={region}>
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.label}
            onPress={() => onSelect?.(m.id)}
            opacity={selectedId && selectedId !== m.id ? 0.6 : 1}
          />
        ))}
      </MapView>
    </View>
  );
}
