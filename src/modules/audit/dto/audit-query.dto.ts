import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AUDIT_ENTITIES, type AuditEntity } from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AUDIT_ENTITIES })
  @IsOptional()
  @IsIn(AUDIT_ENTITIES)
  entityType?: AuditEntity;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  admin?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
