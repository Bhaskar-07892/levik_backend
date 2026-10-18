import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toCsv } from '../../../common/utils/csv.util.js';
import { resolvePeriod, type Bucket } from '../../../common/utils/period.util.js';
import { DashboardQueryDto, DashboardResponseDto, NotificationsResponseDto, ReportQueryDto, SearchQueryDto, SearchResultDto } from '../dto/analytics.dto.js';
import { AnalyticsService } from '../services/analytics.service.js';

const DAY = 86_400_000;

@ApiTags('Admin · Dashboard & shell')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  async dashboard(@Query() query: DashboardQueryDto): Promise<DashboardResponseDto> {
    const d = await this.analytics.dashboard(query.period);
    return { ...d, from: d.from.toISOString() };
  }

  /** Global search across plumbers, retailers, products, scans, invoices, redemptions and schemes. */
  @Get('search')
  search(@Query() query: SearchQueryDto): Promise<SearchResultDto[]> {
    return this.analytics.search(query.q);
  }

  /** Top-bar notifications and sidebar badge counts. */
  @Get('notifications')
  notifications(): Promise<NotificationsResponseDto> {
    return this.analytics.notifications();
  }
}

/** Each report returns JSON, or CSV of the same rows with ?format=csv. */
@ApiTags('Admin · Reports')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('sales')
  @ApiProduces('application/json', 'text/csv')
  async sales(@Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, q, 'verified-sales', await this.analytics.salesByPeriod(this.range(q), this.bucket(q)));
  }

  @Get('points')
  @ApiProduces('application/json', 'text/csv')
  async points(@Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, q, 'points', await this.analytics.pointsByPeriod(this.range(q), this.bucket(q)));
  }

  @Get('scans-by-status')
  @ApiProduces('application/json', 'text/csv')
  async scansByStatus(@Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, q, 'scans-by-status', await this.analytics.scansByStatus(this.range(q)));
  }

  @Get('top-retailers')
  @ApiProduces('application/json', 'text/csv')
  async topRetailers(@Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, q, 'top-retailers', await this.analytics.topRetailers(this.range(q), q.limit));
  }

  @Get('top-products')
  @ApiProduces('application/json', 'text/csv')
  async topProducts(@Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, q, 'top-products', await this.analytics.topProducts(this.range(q), q.limit));
  }

  @Get('scheme-performance')
  @ApiProduces('application/json', 'text/csv')
  async schemePerformance(@Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, q, 'scheme-performance', await this.analytics.schemePerformance());
  }

  private range(q: ReportQueryDto) {
    const to = q.to ?? new Date();
    if (q.period) return { from: resolvePeriod(q.period, to).from ?? new Date(0), to };
    return { from: q.from ?? new Date(to.getTime() - 90 * DAY), to };
  }

  private bucket(q: ReportQueryDto): Bucket {
    return q.bucket ?? (q.period ? resolvePeriod(q.period).bucket : 'week');
  }

  private respond<T extends object>(res: Response, q: ReportQueryDto, name: string, rows: T[]): T[] | string {
    if (q.format !== 'csv') return rows;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="levik-${name}.csv"`);
    return toCsv(rows as Array<Record<string, string | number>>);
  }
}
