import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PERIODS, type Bucket, type Period } from '../../../common/utils/period.util.js';

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: PERIODS, default: '30d' })
  @IsOptional() @IsIn(PERIODS)
  period: Period = '30d';
}

export class ReportQueryDto {
  /** Shortcut matching the portal's period filter; overrides `from` and picks a bucket size. */
  @ApiPropertyOptional({ enum: PERIODS })
  @IsOptional() @IsIn(PERIODS)
  period?: Period;

  /** Defaults to 90 days ago. */
  @IsOptional() @Type(() => Date) @IsDate()
  from?: Date;

  /** Defaults to now. */
  @IsOptional() @Type(() => Date) @IsDate()
  to?: Date;

  /** Defaults to the period's bucket size, else week. */
  @ApiPropertyOptional({ enum: ['day', 'week', 'month'] })
  @IsOptional() @IsIn(['day', 'week', 'month'])
  bucket?: Bucket;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 10;

  @ApiPropertyOptional({ enum: ['json', 'csv'], default: 'json' })
  @IsOptional() @IsIn(['json', 'csv'])
  format: 'json' | 'csv' = 'json';
}

export class SearchQueryDto {
  @IsString() @MinLength(2) @MaxLength(100)
  q: string;
}

export class DashboardKpisDto {
  totalPlumbers: number;
  verifiedPlumbers: number;
  activeRetailers: number;
  productScans: number;
  pendingScans: number;
  pendingInvoices: number;
  activeSchemes: number;
  pointsIssued: number;
  pointsRedeemed: number;
  pendingRedemptions: number;
  /** Approved invoice value (pre-GST) in the period. */
  verifiedSales: number;
}

export class SalesPointDto {
  /** Bucket start (IST), YYYY-MM-DD. */
  bucket: string;
  sales: number;
  invoices: number;
}

export class ScanPointDto {
  bucket: string;
  approved: number;
  pending: number;
  rejected: number;
  flagged: number;
}

export class PointsPointDto {
  bucket: string;
  earned: number;
  redeemed: number;
}

export class DashboardResponseDto {
  from: string;
  bucket: string;
  kpis: DashboardKpisDto;
  salesTrend: SalesPointDto[];
  scanTrend: ScanPointDto[];
  pointsTrend: PointsPointDto[];
}

export class SearchResultDto {
  type: string;
  id: string;
  title: string;
  subtitle: string;
}

export class AdminNotificationDto {
  id: string;
  title: string;
  detail: string;
  count: number;
  href: string;
}

export class QueueCountsDto {
  pendingScans: number;
  pendingInvoices: number;
  requestedRedemptions: number;
  pendingRetailers: number;
  pendingKyc: number;
  lowStock: number;
  openTickets: number;
}

export class NotificationsResponseDto {
  /** Sidebar badge counts. */
  counts: QueueCountsDto;
  items: AdminNotificationDto[];
}
