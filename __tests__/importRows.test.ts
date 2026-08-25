import { parseFarmCsv } from '@/features/import/parseCsv';

describe('farm import — required fields', () => {
  it('accepts an address-only row (no coordinates, no State column)', () => {
    const r = parseFarmCsv('Farm ID,Name,Address\nGF-1,Alpha,"1 County Rd, Fresno CA"');
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0]).toMatchObject({ glowFarmId: 'GF-1', name: 'Alpha', address: '1 County Rd, Fresno CA' });
    // With no State column the address is the only place a state can come from.
    expect(r.rows[0].state).toBe('CA');
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

  it('derives a Farm ID when the file has no ID column', () => {
    const r = parseFarmCsv('Name,Address\nAlpha,1 Rd');
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0]).toMatchObject({ name: 'Alpha', address: '1 Rd', idGenerated: true });
    expect(r.generatedIds).toBe(true);
  });

  it('reports a missing location column once, at the header', () => {
    const r = parseFarmCsv('Farm ID,Name\nGF-1,Alpha');
    expect(r.rows).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].row).toBe(1);
    expect(r.errors[0].message).toMatch(/Address or Coordinates/);
  });

  it('keeps good rows and flags only the bad one', () => {
    const csv = 'Farm ID,Name,Address\nGF-7,Ok,"1 Rd"\n,Missing Id,"2 Rd"';
    const r = parseFarmCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].row).toBe(3);
  });
});

describe('a real spreadsheet', () => {
  it('flags Farm IDs that repeat inside one file', () => {
    // Duplicates silently corrupt an import: the last row wins on upsert, and
    // the geocode backfill matches by Farm ID, so pins can land on the wrong farm.
    const r = parseFarmCsv(
      [
        'Farm ID,Name,Address',
        'GF-1,Alpha Farm,"1 Road, Denver, CO"',
        'GF-2,Beta Farm,"2 Road, Denver, CO"',
        'gf-1,Alpha Farm Again,"3 Road, Denver, CO"',
      ].join('\n'),
    );
    expect(r.rows).toHaveLength(3);
    expect(r.duplicateIds).toHaveLength(1);
    expect(r.duplicateIds[0].toLowerCase()).toBe('gf-1');
  });

  it('reports no duplicates for a clean file', () => {
    const r = parseFarmCsv(
      ['Farm ID,Name,Address', 'GF-1,Alpha,"1 Road, Denver, CO"', 'GF-2,Beta,"2 Road, Denver, CO"'].join('\n'),
    );
    expect(r.duplicateIds).toHaveLength(0);
  });

  it('imports customer contact columns, which had no mapping at all before', () => {
    const r = parseFarmCsv(
      [
        'Farm ID,Name,Address,Owner,Phone,Email',
        'GF-1,Alpha Farm,"1 Road, Denver, CO",Ray Hollenbeck,+1 555 010 1234,ray@example.com',
      ].join('\n'),
    );
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0].contactName).toBe('Ray Hollenbeck');
    expect(r.rows[0].contactPhone).toBe('+1 555 010 1234');
    expect(r.rows[0].contactEmail).toBe('ray@example.com');
  });

  it('accepts the header spellings a real export actually uses', () => {
    const r = parseFarmCsv(
      ['farm_id,Customer Name,Site Address,Latitude,Longitude', 'GF-9,Gamma Farm,,39.74,-104.99'].join('\n'),
    );
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0].glowFarmId).toBe('GF-9');
    expect(r.rows[0].name).toBe('Gamma Farm');
    expect(r.rows[0].lat).toBeCloseTo(39.74);
  });
});
