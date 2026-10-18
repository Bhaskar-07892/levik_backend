import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class ExploreProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PRODUCT_CATEGORIES })
  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES)
  category?: ProductCategory;
}

export class ExploreDealerQueryDto {
  /** Shop name, city or area. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
