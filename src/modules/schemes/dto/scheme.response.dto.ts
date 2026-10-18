import { ApiProperty } from '@nestjs/swagger';
import {
  PRODUCT_CATEGORIES,
  SCHEME_STATUSES,
  SCHEME_TARGET_TYPES,
  USER_ROLES,
  type ProductCategory,
  type SchemeStatus,
  type SchemeTargetType,
  type UserRole,
} from '../../../common/domain/enums.js';

export class SchemeResponseDto {
  id: string;
  name: string;
  description: string;
  @ApiProperty({ enum: USER_ROLES })
  role: UserRole;
  startDate: string;
  endDate: string;
  @ApiProperty({ enum: PRODUCT_CATEGORIES, isArray: true })
  eligibleCategories: ProductCategory[];
  @ApiProperty({ enum: SCHEME_TARGET_TYPES })
  targetType: SchemeTargetType;
  targetValue: number;
  incentivePoints: number;
  @ApiProperty({ enum: SCHEME_STATUSES })
  status: SchemeStatus;
  createdAt: string;
  updatedAt: string;
}

export class SchemeSummaryDto {
  participants: number;
  achievers: number;
  averagePercent: number;
  bonusPointsIssued: number;
}

export class SchemeWithSummaryResponseDto extends SchemeResponseDto {
  summary: SchemeSummaryDto;
}

export class SchemePageResponseDto {
  items: SchemeWithSummaryResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class SchemeParticipantResponseDto {
  userId: string;
  name: string;
  location: string;
  progress: number;
  percent: number;
  awarded: boolean;
}

export class SchemeImpactResponseDto {
  schemeId: string;
  schemeName: string;
  @ApiProperty({ enum: SCHEME_TARGET_TYPES })
  targetType: SchemeTargetType;
  targetValue: number;
  incentivePoints: number;
  before: number;
  after: number;
  willAward: boolean;
  alreadyAwarded: boolean;
}

export class MySchemeProgressResponseDto extends SchemeResponseDto {
  progress: number;
  percent: number;
  awarded: boolean;
}
