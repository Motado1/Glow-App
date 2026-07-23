import { buildAppleMapsDestUrl, buildGoogleMapsDestUrl, buildGoogleMapsRouteUrl } from '@/features/routing/mapsLinks';

describe('maps deep links', () => {
  it('google single destination', () => {
    expect(buildGoogleMapsDestUrl({ lat: 39.7, lng: -104.9 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=39.7,-104.9',
    );
  });

  it('google multi-waypoint with origin', () => {
    const url = buildGoogleMapsRouteUrl([{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, { lat: 3, lng: 3 }], { lat: 0, lng: 0 });
    expect(url).toContain('origin=0,0');
    expect(url).toContain('destination=3,3');
    expect(decodeURIComponent(url)).toContain('1,1|2,2');
  });

  it('apple single destination with label (no multi-stop)', () => {
    expect(buildAppleMapsDestUrl({ lat: 1, lng: 2 }, 'Farm A')).toBe('http://maps.apple.com/?daddr=1,2&q=Farm%20A');
  });
});
