/** Geo helpers for routing and mileage estimates. */
import type { GeoPoint } from '@/domain/types';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in miles between two points. */
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8; // Earth radius, miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatMiles(mi: number): string {
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

/** Rough drive-time estimate from straight-line distance. */
export function estDriveMinutes(miles: number, mph = 45): number {
  return Math.round((miles / mph) * 60);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
