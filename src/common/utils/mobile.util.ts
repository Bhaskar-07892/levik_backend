/** Normalises an Indian mobile number. Returns null when it is not a valid +91 mobile. */
export function normalizeIndianMobile(input: string): { digits: string; display: string } | null {
  let digits = (input ?? '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length === 12 && digits.startsWith('0')) return null;
  if (!/^91[6-9]\d{9}$/.test(digits)) return null;
  return { digits, display: `+91 ${digits.slice(2, 7)} ${digits.slice(7)}` };
}
