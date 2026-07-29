/**
 * Device GPS, wrapped so it NEVER throws at the caller.
 *
 * This matters on web: expo-location's `requestForegroundPermissionsAsync`
 * throws outright when `navigator.permissions.query` is missing (older Safari,
 * or any non-secure origin), which would otherwise crash the route screen.
 */
import * as Location from 'expo-location';
import type { GeoPoint } from '@/domain/types';

export type LocationResult =
  | { ok: true; point: GeoPoint; accuracyMeters?: number }
  | { ok: false; message: string };

export async function getCurrentPoint(): Promise<LocationResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      return {
        ok: false,
        message: perm.canAskAgain
          ? 'Location permission was denied.'
          : 'Location is turned off for this app. Enable it in settings, or pick a starting farm instead.',
      };
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      ok: true,
      point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      accuracyMeters: pos.coords.accuracy ?? undefined,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Location is unavailable on this device.',
    };
  }
}
