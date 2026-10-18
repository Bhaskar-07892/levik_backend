import { toCsv } from './csv.util.js';
import { normalizeIndianMobile } from './mobile.util.js';

describe('normalizeIndianMobile', () => {
  it.each(['9829011234', '+91 98290 11234', '919829011234', '+91-98290-11234'])('accepts %s', (input) => {
    expect(normalizeIndianMobile(input)).toEqual({ digits: '919829011234', display: '+91 98290 11234' });
  });

  it.each(['', '12345', '5829011234', '0919829011234', '44 20 7946 0958'])('rejects %s', (input) => {
    expect(normalizeIndianMobile(input)).toBeNull();
  });
});

describe('toCsv', () => {
  it('quotes and escapes values', () => {
    expect(toCsv([{ a: 'x, y', b: 'say "hi"', c: null }])).toBe('a,b,c\n"x, y","say ""hi""",');
  });

  it('neutralises formula injection in text but keeps negative numbers numeric', () => {
    expect(toCsv([{ name: '=HYPERLINK("x")', points: -2500 }])).toBe('name,points\n"\'=HYPERLINK(""x"")",-2500');
  });

  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });
});
