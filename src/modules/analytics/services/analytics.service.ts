import { Injectable } from '@nestjs/common';
import { resolvePeriod, type Bucket, type Period } from '../../../common/utils/period.util.js';
import { SchemesService } from '../../schemes/services/schemes.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import type { AdminNotificationBo, DashboardBo, RangeBo, SearchResultBo } from '../bo/analytics.bo.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';

const SEARCH_LIMIT = 8;

/** Dashboards, reports and admin-shell read models. Every figure is computed from the live tables. */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly analytics: AnalyticsRepository,
    private readonly schemes: SchemesService,
    private readonly settings: SettingsService,
  ) {}

  async dashboard(period: Period): Promise<DashboardBo> {
    const { from: periodFrom, bucket } = resolvePeriod(period);
    const from = periodFrom ?? (await this.analytics.earliestActivity());
    const to = new Date();
    const [kpis, salesTrend, scanTrend, pointsTrend] = await Promise.all([
      this.analytics.kpis(from),
      this.analytics.salesTrend(bucket, from, to),
      this.analytics.scanTrend(bucket, from, to),
      this.analytics.pointsTrend(bucket, from, to),
    ]);
    return { from, bucket, kpis, salesTrend, scanTrend, pointsTrend };
  }

  salesByPeriod(range: RangeBo, bucket: Bucket) {
    return this.analytics.salesTrend(bucket, range.from, range.to);
  }

  pointsByPeriod(range: RangeBo, bucket: Bucket) {
    return this.analytics.pointsTrend(bucket, range.from, range.to);
  }

  scansByStatus(range: RangeBo) {
    return this.analytics.scansByStatus(range.from, range.to);
  }

  topRetailers(range: RangeBo, limit: number) {
    return this.analytics.topRetailers(range.from, range.to, limit);
  }

  topProducts(range: RangeBo, limit: number) {
    return this.analytics.topProducts(range.from, range.to, limit);
  }

  async schemePerformance() {
    const page = await this.schemes.list({ page: 1, pageSize: 100 });
    return page.items.map((s) => ({
      schemeId: s.id,
      name: s.name,
      role: s.role,
      status: s.status,
      participants: s.summary.participants,
      achievers: s.summary.achievers,
      averagePercent: s.summary.averagePercent,
      bonusPointsIssued: s.summary.bonusPointsIssued,
    }));
  }

  search(query: string): Promise<SearchResultBo[]> {
    return this.analytics.search(query, SEARCH_LIMIT);
  }

  /** Work queues for the top-bar menu and sidebar badges, filtered by notification preferences. */
  async notifications(): Promise<{ counts: Awaited<ReturnType<AnalyticsRepository['queueCounts']>>; items: AdminNotificationBo[] }> {
    const settings = await this.settings.get();
    const counts = await this.analytics.queueCounts(settings.lowStockThreshold);
    const prefs = settings.notifications;
    const items: AdminNotificationBo[] = [];
    const add = (enabled: boolean, id: string, count: number, title: string, detail: string, href: string) => {
      if (enabled && count > 0) items.push({ id, count, title, detail, href });
    };
    add(prefs.pendingScans, 'scans', counts.pendingScans, `${counts.pendingScans} product scans awaiting verification`, 'Review proof of sale before crediting points', '/scans');
    add(prefs.pendingInvoices, 'invoices', counts.pendingInvoices, `${counts.pendingInvoices} invoices pending review`, 'Approve to credit retailer incentives', '/invoices');
    add(prefs.redemptions, 'redemptions', counts.requestedRedemptions, `${counts.requestedRedemptions} reward requests to process`, 'Validate balance and stock', '/redemptions');
    add(true, 'retailers', counts.pendingRetailers, `${counts.pendingRetailers} retailer applications pending`, 'Approve or reject new shops', '/retailers');
    add(true, 'kyc', counts.pendingKyc, `${counts.pendingKyc} plumber KYC checks pending`, 'Verify identity before scans can be credited', '/plumbers');
    add(prefs.lowStock, 'stock', counts.lowStock, `${counts.lowStock} retailer stock lines low or out`, 'Retailer-reported inventory', '/inventory');
    return { counts, items };
  }
}
