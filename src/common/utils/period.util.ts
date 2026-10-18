export const PERIODS = ['7d', '30d', '90d', 'all'] as const;
export type Period = (typeof PERIODS)[number];
export type Bucket = 'day' | 'week' | 'month';

/** Start of the reporting window (local midnight) and the chart bucket size for a period. */
export function resolvePeriod(period: Period, now = new Date()): { from: Date | null; bucket: Bucket } {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 0;
  if (!days) return { from: null, bucket: 'month' };
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  return { from, bucket: days <= 30 ? 'day' : 'week' };
}
