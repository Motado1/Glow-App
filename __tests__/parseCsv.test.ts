import { parseFarmCsv } from '@/features/import/parseCsv';

describe('parseFarmCsv', () => {
  it('parses valid rows using header aliases', () => {
    const csv = 'Glow Farm ID,Farm Name,Full Address,State,Latitude,Longitude\nGF-1,Alpha,1 Rd,CO,39.5,-104.9';
    const r = parseFarmCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ glowFarmId: 'GF-1', name: 'Alpha', state: 'CO', lat: 39.5, lng: -104.9 });
    expect(r.errors).toHaveLength(0);
  });

  it('flags a file with no location column at all', () => {
    const r = parseFarmCsv('name,contact\nAlpha,Ray Hollenbeck');
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.rows).toHaveLength(0);
  });

  it('reports per-row missing fields with the file line number', () => {
    const csv = 'glowFarmId,name,address,state\nGF-1,Alpha,1 Rd,CO\n,Beta,2 Rd,KS';
    const r = parseFarmCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].row).toBe(3);
  });
});
