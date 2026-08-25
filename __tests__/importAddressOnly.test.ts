/**
 * The shape of the real region exports: one Address column and nothing else.
 * Every row here is an address from the Riverton, Utah list.
 */
import { deriveFarmId, deriveFarmName, normalizeState, parseAddressParts } from '@/features/import/address';
import { parseFarmCsv } from '@/features/import/parseCsv';

const RIVERTON = `Address
"12797 St Ann Christine Ct, Riverton, Utah 84065"
"12783 South 2525 West, Riverton, Utah 84065"
"2603 West 12875 South, Riverton, Utah 84065"
"3012 West 12825 South, Riverton, Utah 84065"
"2664 Mont Sur Dr, Riverton, Utah 84065"
"12461 Covey Ln, Riverton, Utah 84065"
`;

describe('an address-only region export', () => {
  it('imports every row without a Farm ID or Name column', () => {
    const r = parseFarmCsv(RIVERTON);
    expect(r.errors).toHaveLength(0);
    expect(r.rows).toHaveLength(6);
    expect(r.generatedIds).toBe(true);
    expect(r.generatedNames).toBe(true);
  });

  it('names each farm after its street line and keeps the full address', () => {
    const r = parseFarmCsv(RIVERTON);
    expect(r.rows[0]).toMatchObject({
      name: '12797 St Ann Christine Ct',
      address: '12797 St Ann Christine Ct, Riverton, Utah 84065',
      state: 'UT',
      idGenerated: true,
      nameGenerated: true,
    });
    expect(r.rows[4].name).toBe('2664 Mont Sur Dr');
  });

  it('gives every row a distinct Farm ID', () => {
    const r = parseFarmCsv(RIVERTON);
    const ids = new Set(r.rows.map((x) => x.glowFarmId));
    expect(ids.size).toBe(6);
    expect(r.duplicateIds).toEqual([]);
  });

  it('generates the same IDs on a re-import, so the same file updates instead of duplicating', () => {
    const first = parseFarmCsv(RIVERTON).rows.map((x) => x.glowFarmId);
    // Same list, re-exported: different row order, different quoting/spacing.
    const again = parseFarmCsv(
      'Address\n"2664 Mont Sur Dr, Riverton, Utah 84065"\n"12797 St Ann Christine Ct,  Riverton, Utah 84065"\n',
    ).rows.map((x) => x.glowFarmId);
    expect(again[0]).toBe(first[4]);
    expect(again[1]).toBe(first[0]);
  });

  it('marks a generated ID so it is not mistaken for a Glow farm ID', () => {
    expect(parseFarmCsv(RIVERTON).rows[0].glowFarmId).toMatch(/^AUTO-/);
  });

  it('still requires a location — a bare list of names is not importable', () => {
    const r = parseFarmCsv('Name\nAlpha\nBeta');
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0]).toMatchObject({ row: 1 });
    expect(r.errors[0].message).toMatch(/Address or Coordinates/);
  });

  it('still flags a blank ID when the file does carry an ID column', () => {
    const r = parseFarmCsv('Farm ID,Name,Address\nGF-7,Ok,"1 Rd"\n,Missing Id,"2 Rd"');
    expect(r.rows).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ row: 3 });
    expect(r.generatedIds).toBe(false);
  });

  it('derives an ID for a coordinates-only file too', () => {
    const r = parseFarmCsv('Coordinates\n"40.52, -111.94"');
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0]).toMatchObject({ lat: 40.52, lng: -111.94, glowFarmId: expect.stringMatching(/^AUTO-/) });
  });
});

describe('state', () => {
  it('is read off the address when the file has no State column', () => {
    expect(parseFarmCsv(RIVERTON).rows[2].state).toBe('UT');
  });

  it('normalises a spelled-out State column to a USPS code', () => {
    const r = parseFarmCsv('Farm ID,Name,Address,State\nGF-1,Alpha,"1 Rd, Greeley",Colorado');
    expect(r.rows[0].state).toBe('CO');
  });

  it('keeps an unrecognised State value rather than dropping it', () => {
    const r = parseFarmCsv('Farm ID,Name,Address,State\nGF-1,Alpha,"1 Rd",Front Range');
    expect(r.rows[0].state).toBe('Front Range');
  });

  it('is left unset when the address does not say one', () => {
    const r = parseFarmCsv('Address\n"1 County Rd 5"');
    expect(r.rows[0].state).toBeUndefined();
  });
});

describe('parseAddressParts', () => {
  it('splits a standard "street, city, state zip"', () => {
    expect(parseAddressParts('12797 St Ann Christine Ct, Riverton, Utah 84065')).toEqual({
      street: '12797 St Ann Christine Ct',
      city: 'Riverton',
      state: 'UT',
      zip: '84065',
    });
  });

  it('handles a directional street name that looks like a city', () => {
    expect(parseAddressParts('12783 South 2525 West, Riverton, Utah 84065')).toMatchObject({
      street: '12783 South 2525 West',
      city: 'Riverton',
      state: 'UT',
    });
  });

  it('handles a two-letter code, a ZIP+4, and a trailing country', () => {
    expect(parseAddressParts('88 Mesa Dr, Wichita, KS 67202-1234, USA')).toMatchObject({
      street: '88 Mesa Dr',
      city: 'Wichita',
      state: 'KS',
      zip: '67202',
    });
  });

  it('handles a two-word state and no commas at all', () => {
    expect(parseAddressParts('40 Mill Rd Nashua New Hampshire 03060')).toMatchObject({
      state: 'NH',
      zip: '03060',
    });
  });

  it('leaves what it cannot identify undefined', () => {
    expect(parseAddressParts('Back forty, past the silo')).toEqual({
      street: 'Back forty',
      city: 'past the silo',
    });
  });

  it('does not mistake a street word for a state', () => {
    expect(parseAddressParts('1 Washington Ave, Denver, CO 80202').state).toBe('CO');
    expect(parseAddressParts('100 Indiana St').state).toBeUndefined();
  });
});

describe('helpers', () => {
  it('normalizeState accepts names, codes and neither', () => {
    expect(normalizeState('utah')).toBe('UT');
    expect(normalizeState('ut')).toBe('UT');
    expect(normalizeState('District of Columbia')).toBe('DC');
    expect(normalizeState('Riverton')).toBeUndefined();
  });

  it('deriveFarmName falls back to the whole address when there is no comma', () => {
    expect(deriveFarmName('12461 Covey Ln')).toBe('12461 Covey Ln');
  });

  it('deriveFarmId ignores case and spacing but not the address itself', () => {
    expect(deriveFarmId('12461 Covey Ln, Riverton, Utah 84065')).toBe(
      deriveFarmId('  12461 COVEY LN,  Riverton, Utah 84065 '.replace(/,\s+/g, ', ')),
    );
    expect(deriveFarmId('12461 Covey Ln')).not.toBe(deriveFarmId('12463 Covey Ln'));
  });
});
