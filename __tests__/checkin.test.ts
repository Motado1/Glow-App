import {
  classifyCheckIn,
  formatCheckInDistance,
  officeLabel,
  GEOFENCE_MILES,
  MAX_USEFUL_ACCURACY_M,
} from '@/features/checkin/classify';

const FARM = { lat: 39.7392, lng: -104.9903 };

/** Offset a point north by a given number of miles (1 deg lat ≈ 69.05 mi). */
function north(miles: number) {
  return { lat: FARM.lat + miles / 69.05, lng: FARM.lng };
}

describe('check-in classification', () => {
  it('counts standing on the farm as on site', () => {
    const r = classifyCheckIn({ point: FARM, accuracyMeters: 8, farmLocation: FARM });
    expect(r.verdict).toBe('on_site');
    expect(r.withinGeofence).toBe(true);
    expect(r.distanceMiles).toBeCloseTo(0, 5);
  });

  it('counts just inside the fence as on site', () => {
    const r = classifyCheckIn({ point: north(GEOFENCE_MILES * 0.9), accuracyMeters: 10, farmLocation: FARM });
    expect(r.verdict).toBe('on_site');
    expect(r.withinGeofence).toBe(true);
  });

  it('flags a photographer across town', () => {
    const r = classifyCheckIn({ point: north(2.3), accuracyMeters: 10, farmLocation: FARM });
    expect(r.verdict).toBe('off_site');
    expect(r.withinGeofence).toBe(false);
    expect(r.distanceMiles).toBeCloseTo(2.3, 1);
  });

  it('records no GPS rather than guessing when the fix failed', () => {
    const r = classifyCheckIn({ farmLocation: FARM });
    expect(r.verdict).toBe('no_gps');
    expect(r.withinGeofence).toBe(false);
    expect(r.distanceMiles).toBeUndefined();
  });

  it('blames the missing map pin, not the photographer', () => {
    const r = classifyCheckIn({ point: FARM, accuracyMeters: 8 });
    expect(r.verdict).toBe('no_farm_location');
    expect(r.withinGeofence).toBe(false);
  });

  it('will not call someone off site on a fix too coarse to prove it', () => {
    // 0.15 mi away, but the phone only knows where it is to within 400 m —
    // which is further than the gap being measured.
    const r = classifyCheckIn({
      point: north(0.15),
      accuracyMeters: MAX_USEFUL_ACCURACY_M + 150,
      farmLocation: FARM,
    });
    expect(r.verdict).toBe('low_accuracy');
    expect(r.withinGeofence).toBe(false);
  });

  it('still trusts a coarse fix that lands inside the fence', () => {
    // Error can only have moved them closer to the boundary, never across it.
    const r = classifyCheckIn({ point: FARM, accuracyMeters: 900, farmLocation: FARM });
    expect(r.verdict).toBe('on_site');
    expect(r.withinGeofence).toBe(true);
  });

  it('treats an unknown accuracy as usable rather than discarding the reading', () => {
    const r = classifyCheckIn({ point: north(2), farmLocation: FARM });
    expect(r.verdict).toBe('off_site');
  });
});

describe('what the office sees', () => {
  it('flags only a genuine off-site visit', () => {
    const flagged = (i: Parameters<typeof classifyCheckIn>[0]) => officeLabel(classifyCheckIn(i)).flagged;
    expect(flagged({ point: north(5), accuracyMeters: 10, farmLocation: FARM })).toBe(true);
    expect(flagged({ point: FARM, accuracyMeters: 10, farmLocation: FARM })).toBe(false);
    expect(flagged({ farmLocation: FARM })).toBe(false);
    expect(flagged({ point: FARM, accuracyMeters: 10 })).toBe(false);
    expect(flagged({ point: north(0.15), accuracyMeters: 900, farmLocation: FARM })).toBe(false);
  });
});

describe('distance formatting', () => {
  it('uses feet up close, where miles would read as zero', () => {
    expect(formatCheckInDistance(0.004)).toBe('21 ft');
    expect(formatCheckInDistance(0.02)).toBe('106 ft');
  });

  it('uses miles further out', () => {
    expect(formatCheckInDistance(2.345)).toBe('2.35 mi');
    expect(formatCheckInDistance(24.6)).toBe('25 mi');
  });
});
