import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class CreateLabelBatchRequestDto {
  /** Number of unique labels (one per physical unit). */
  @IsInt()
  @Min(1)
  @Max(10_000)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class LabelBatchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  productId?: string;
}

/** Which slice of a batch to print; large batches are printed in parts. */
export class LabelSheetQueryDto {
  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @ApiPropertyOptional({ default: 1200, minimum: 1, maximum: 2400 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2400)
  limit: number = 1200;
}

export class ResolveLabelQueryDto {
  /** Scanned QR payload (URL) or a typed serial. */
  @IsString()
  @MinLength(4)
  @MaxLength(300)
  code: string;
}
