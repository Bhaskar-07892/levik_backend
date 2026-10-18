import { ApiProperty } from '@nestjs/swagger';
import { POINTS_SOURCES, RELATED_ENTITIES, USER_ROLES, type PointsSource, type RelatedEntity, type UserRole } from '../../../common/domain/enums.js';

export class RelatedRefDto {
  @ApiProperty({ enum: RELATED_ENTITIES })
  type: RelatedEntity;
  id: string;
}

export class PointsTransactionResponseDto {
  id: string;
  userId: string;
  @ApiProperty({ enum: USER_ROLES })
  userRole: UserRole;
  userName: string;
  @ApiProperty({ enum: POINTS_SOURCES })
  source: PointsSource;
  related?: RelatedRefDto;
  credit: number;
  debit: number;
  createdAt: string;
  status: 'Posted';
  note: string;
  createdBy: string;
}

export class PointsTransactionPageResponseDto {
  items: PointsTransactionResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class PointsBalanceResponseDto {
  userId: string;
  @ApiProperty({ enum: USER_ROLES })
  userRole: UserRole;
  lifetime: number;
  redeemed: number;
  available: number;
}

export class LedgerTotalsResponseDto {
  credited: number;
  debited: number;
  count: number;
}

export class AdjustmentResponseDto {
  transactionId: string;
}
