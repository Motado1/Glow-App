/**
 * Did the photographer actually stand at the farm?
 *
 * Pure — no React, no repository, no GPS calls — so every verdict below is
 * unit-testable, including the ones that are nobody's fault.
 *
 * The design rule this encodes: **a check-in never blocks work.** GPS fails,
 * farms are hundreds of acres, and a photographer stranded at a gate because a
 * satellite fix drifted is a worse outcome than a photo shot from the road. The
 * job here is to record what happened honestly, not to enforce.
 */
import type { GeoPoint } from '@/domain/types';
import { haversineMiles } from '@/lib/geo';

/**
 * How close counts as on-site, in miles. 0.1 mi ≈ 528 ft ≈ 161 m — big enough
 * to cover a long driveway and a phone's normal drift, small enough that the
 * next property over doesn't pass.
 */
export const GEOFENCE_MILES = 0.1;

/**
 * Above this, the fix is too vague to judge against a 161 m fence: a reading
 * accurate to ±300 m can sit "outside" the fence while the phone is in the
 * farmyard. Treated as unverifiable rather than as evidence of anything.
 */
export const MAX_USEFUL_ACCURACY_M = 250;

export type CheckInVerdict =
  /** Inside the fence. */
  | 'on_site'
  /** Outside it, with a fix good enough to mean something. */
  | 'off_site'
  /** No fix at all — permission denied, hardware off, or a desktop browser. */
  | 'no_gps'
  /** The farm has no coordinates on file, so there is nothing to compare to. */
  | 'no_farm_location'
  /** A fix arrived, but too imprecise to place them either side of the line. */
  | 'low_accuracy';

export interface CheckInInput {
  /** Where the device says it is. Absent when the fix failed. */
  point?: GeoPoint;
  /** Reported GPS accuracy radius, in metres. */
  accuracyMeters?: number;
  /** The farm's stored coordinates. Absent for address-only imports. */
  farmLocation?: GeoPoint;
}

export interface CheckInResult {
  verdict: CheckInVerdict;
  /** Straight-line distance in miles, when both points are known. */
  distanceMiles?: number;
  /** True only for `on_site`. `false` is not the same as "they weren't there". */
  withinGeofence: boolean;
}

export function classifyCheckIn({
  point,
  accuracyMeters,
  farmLocation,
}: CheckInInput): CheckInResult {
  if (!point) return { verdict: 'no_gps', withinGeofence: false };
  if (!farmLocation) return { verdict: 'no_farm_location', withinGeofence: false };

  const distanceMiles = haversineMiles(point, farmLocation);

  if (distanceMiles <= GEOFENCE_MILES) {
    return { verdict: 'on_site', distanceMiles, withinGeofence: true };
  }

  // Order matters: a fix that lands inside the fence is trustworthy however
  // coarse it is, because the error can only have moved it closer. One that
  // lands outside is only meaningful if the error is smaller than the gap.
  if (accuracyMeters != null && accuracyMeters > MAX_USEFUL_ACCURACY_M) {
    return { verdict: 'low_accuracy', distanceMiles, withinGeofence: false };
  }

  return { verdict: 'off_site', distanceMiles, withinGeofence: false };
}

/** Short distance for a UI that has to fit "0.02 mi" as well as "24 mi". */
export function formatCheckInDistance(miles: number): string {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
  if (miles < 10) return `${miles.toFixed(2)} mi`;
  return `${Math.round(miles)} mi`;
}

/** What the person in the field is told. Never accusatory — they may be right. */
export function fieldMessage(r: CheckInResult): string {
  switch (r.verdict) {
    case 'on_site':
      return `Checked in · ${formatCheckInDistance(r.distanceMiles ?? 0)} from the farm`;
    case 'off_site':
      return `You're ${formatCheckInDistance(r.distanceMiles ?? 0)} from this farm. Right property?`;
    case 'low_accuracy':
      return "Your location isn't precise enough to check in. Photos will still be saved.";
    case 'no_farm_location':
      return 'This farm has no map pin, so there’s nothing to check in against.';
    case 'no_gps':
    default:
      return 'Location is off, so this visit can’t be recorded. Photos will still be saved.';
  }
}

/** What the office is told. Flags only the case that is actually a finding. */
export function officeLabel(r: CheckInResult): { label: string; flagged: boolean } {
  switch (r.verdict) {
    case 'on_site':
      return { label: `On site · ${formatCheckInDistance(r.distanceMiles ?? 0)}`, flagged: false };
    case 'off_site':
      return { label: `Off site · ${formatCheckInDistance(r.distanceMiles ?? 0)} away`, flagged: true };
    case 'low_accuracy':
      return { label: 'Location too imprecise to verify', flagged: false };
    case 'no_farm_location':
      return { label: 'No map pin on this farm', flagged: false };
    case 'no_gps':
    default:
      return { label: 'No location recorded', flagged: false };
  }
}
