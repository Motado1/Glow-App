import { parseFarmCsv } from '@/features/import/parseCsv';

describe('farm import — required fields', () => {
  it('accepts an address-only row (no coordinates, no state)', () => {
    const r = parseFarmCsv('Farm ID,Name,Address\nGF-1,Alpha,"1 County Rd, Fresno CA"');
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0]).toMatchObject({ glowFarmId: 'GF-1', name: 'Alpha', address: '1 County Rd, Fresno CA' });
    expect(r.rows[0].state).toBeUndefined();
  });

  it('accepts a coordinates-only row (no address)', () => {
    const r = parseFarmCsv('Farm ID,Name,Latitude,Longitude\nGF-2,Beta,39.5,-104.9');
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0]).toMatchObject({ glowFarmId: 'GF-2', name: 'Beta', lat: 39.5, lng: -104.9 });
    expect(r.rows[0].address).toBeUndefined();
  });

  it('accepts a single combined "lat, lng" cell', () => {
    const r = parseFarmCsv('Farm ID,Name,Coordinates\nGF-3,Gamma,"39.5, -104.9"');
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0]).toMatchObject({ lat: 39.5, lng: -104.9 });
  });

  it('rejects a row with neither an address nor coordinates', () => {
    const r = parseFarmCsv('Farm ID,Name,Address\nGF-4,Delta,');
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0].message).toMatch(/Address or Coordinates/);
  });

  it('rejects out-of-range coordinates instead of importing a bad pin', () => {
    const r = parseFarmCsv('Farm ID,Name,Latitude,Longitude\nGF-5,Eps,999,-104.9');
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0].message).toMatch(/Invalid latitude\/longitude/);
  });

  it('rejects a lone latitude with no longitude (previously imported unroutable)', () => {
    const r = parseFarmCsv('Farm ID,Name,Latitude,Longitude\nGF-6,Zeta,39.5,');
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0].message).toMatch(/both be provided/);
  });

  it('reports missing required columns once, at the header', () => {
    const r = parseFarmCsv('Name,Address\nAlpha,1 Rd');
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0].row).toBe(1);
    expect(r.errors[0].message).toMatch(/Farm ID/);
  });

  it('keeps good rows and flags only the bad one', () => {
    const csv = 'Farm ID,Name,Address\nGF-7,Ok,"1 Rd"\n,Missing Id,"2 Rd"';
    const r = parseFarmCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].row).toBe(3);
  });
});
