/**
 * Deep-link builders for handing a route off to Apple Maps or Google Maps
 * (requirements §7). Pure string builders (no react-native import) so they're
 * unit-testable and RN-safe. The default field action is "navigate to the next
 * stop" (single destination — works on every platform); the multi-waypoint URL
 * is Google-only (Apple Maps has no reliable multi-stop scheme).
 */
import type { GeoPoint } from '@/domain/types';

function coord(p: GeoPoint): string {
  return `${p.lat},${p.lng}`;
}

/** Single-destination Google Maps directions URL. */
export function buildGoogleMapsDestUrl(dest: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coord(dest)}`;
}

/** Multi-stop Google Maps directions (origin + waypoints + destination). */
export function buildGoogleMapsRouteUrl(stops: GeoPoint[], start?: GeoPoint): string {
  if (stops.length === 0) return 'https://www.google.com/maps';
  const dest = stops[stops.length - 1];
  const mids = stops.slice(0, -1).map(coord).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&destination=${coord(dest)}`;
  if (start) url += `&origin=${coord(start)}`;
  if (mids) url += `&waypoints=${encodeURIComponent(mids)}`;
  return url;
}

/** Single-destination Apple Maps URL. */
export function buildAppleMapsDestUrl(dest: GeoPoint, label?: string): string {
  let url = `http://maps.apple.com/?daddr=${coord(dest)}`;
  if (label) url += `&q=${encodeURIComponent(label)}`;
  return url;
}
