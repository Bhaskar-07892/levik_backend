import { configureFileUrls, documentUrl, fileUrl, verifyDocumentLink, verifyFileLink } from './file-url.js';

const KEY = 'profile-photo_0b6b5a3e-8f0e-4a8e-9c7e-0d6f3c1a2b4c.jpg';
const NOW = Date.UTC(2026, 9, 19, 10, 30);

function parse(url: string) {
  const [path, query] = url.split('?');
  const params = new URLSearchParams(query);
  return { path, exp: Number(params.get('exp')), sig: params.get('sig')! };
}

describe('file links', () => {
  beforeAll(() => configureFileUrls('unit-test-secret-unit-test-secret-1234', 'api'));

  it('builds a signed link under /api/v1/files that verifies', () => {
    const { path, exp, sig } = parse(fileUrl(KEY, NOW)!);
    expect(path).toBe(`/api/v1/files/${KEY}`);
    expect(verifyFileLink(KEY, exp, sig, NOW)).toBe(true);
  });

  it('stays identical within a day and expires one to two days later', () => {
    const morning = parse(fileUrl(KEY, Date.UTC(2026, 9, 19, 0, 5))!);
    const evening = parse(fileUrl(KEY, Date.UTC(2026, 9, 19, 23, 55))!);
    expect(evening).toEqual(morning);
    expect(morning.exp * 1000).toBe(Date.UTC(2026, 9, 21));
    expect(verifyFileLink(KEY, morning.exp, morning.sig, Date.UTC(2026, 9, 20, 23))).toBe(true);
    expect(verifyFileLink(KEY, morning.exp, morning.sig, Date.UTC(2026, 9, 21, 0, 1))).toBe(false);
  });

  it('rejects another key, a changed expiry and a tampered signature', () => {
    const { exp, sig } = parse(fileUrl(KEY, NOW)!);
    expect(verifyFileLink(KEY.replace('profile', 'shop'), exp, sig, NOW)).toBe(false);
    expect(verifyFileLink(KEY, exp + 86_400, sig, NOW)).toBe(false);
    expect(verifyFileLink(KEY, exp, `${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`, NOW)).toBe(false);
    expect(verifyFileLink(KEY, exp, sig.slice(0, 10), NOW)).toBe(false);
  });

  it('rejects links signed with another secret', () => {
    const { exp, sig } = parse(fileUrl(KEY, NOW)!);
    configureFileUrls('a-different-secret-a-different-secret', 'api');
    expect(verifyFileLink(KEY, exp, sig, NOW)).toBe(false);
    configureFileUrls('unit-test-secret-unit-test-secret-1234', 'api');
  });

  it('returns undefined when there is no file', () => {
    expect(fileUrl(null)).toBeUndefined();
    expect(fileUrl(undefined)).toBeUndefined();
  });
});

describe('document links', () => {
  beforeAll(() => configureFileUrls('unit-test-secret-unit-test-secret-1234', 'api'));

  it('signs a document path that only verifies for the same kind and id', () => {
    const url = documentUrl('bills', 'BILL-7', NOW);
    const [path, query] = url.split('?');
    const params = new URLSearchParams(query);
    expect(path).toBe('/api/v1/documents/bills/BILL-7');
    const exp = Number(params.get('exp'));
    const sig = params.get('sig')!;
    expect(verifyDocumentLink('bills', 'BILL-7', exp, sig, NOW)).toBe(true);
    expect(verifyDocumentLink('bills', 'BILL-8', exp, sig, NOW)).toBe(false);
    expect(verifyDocumentLink('purchase-invoices', 'BILL-7', exp, sig, NOW)).toBe(false);
    // A document signature is never valid as a file link, and vice versa.
    expect(verifyFileLink('bills/BILL-7', exp, sig, NOW)).toBe(false);
  });
});
