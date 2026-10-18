import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, NotEquals } from 'class-validator';
import { POINTS_SOURCES, RELATED_ENTITIES, USER_ROLES, type PointsSource, type RelatedEntity, type UserRole } from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { ReasonRequestDto } from '../../../common/dto/reason.request.dto.js';

export class LedgerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @ApiPropertyOptional({ enum: POINTS_SOURCES })
  @IsOptional()
  @IsIn(POINTS_SOURCES)
  source?: PointsSource;

  @ApiPropertyOptional({ enum: ['credit', 'debit'] })
  @IsOptional()
  @IsIn(['credit', 'debit'])
  direction?: 'credit' | 'debit';

  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: RELATED_ENTITIES })
  @IsOptional()
  @IsIn(RELATED_ENTITIES)
  relatedType?: RelatedEntity;

  @IsOptional()
  @IsString()
  relatedId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}

export class WalletQueryDto extends PaginationQueryDto {}

export class AdjustPointsRequestDto extends ReasonRequestDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  // Explicit schema: the Swagger plugin drops properties validated with @NotEquals.
  @ApiProperty({ type: 'integer', minimum: -1_000_000, maximum: 1_000_000, description: 'Positive to credit, negative to debit (never 0).' })
  @IsInt()
  @NotEquals(0)
  @Min(-1_000_000)
  @Max(1_000_000)
  amount: number;
}
