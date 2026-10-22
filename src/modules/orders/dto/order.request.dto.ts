import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { ORDER_STATUSES, type OrderStatus } from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { trim } from '../../../common/utils/transform.util.js';

export class OrderLineRequestDto {
  @IsString() productId: string;
  @IsInt() @Min(1) @Max(10_000) quantity: number;
}

export class PlaceOrderRequestDto {
  @ApiProperty({ type: [OrderLineRequestDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => OrderLineRequestDto)
  lines: OrderLineRequestDto[];

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) note?: string;
}

export class OrderQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() retailerId?: string;
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional() @IsIn(ORDER_STATUSES) status?: OrderStatus;
}

export class MyOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional() @IsIn(ORDER_STATUSES) status?: OrderStatus;
}

export class UpdateOrderStatusRequestDto {
  @ApiProperty({ enum: ['Confirmed', 'Dispatched', 'Delivered', 'Cancelled'] })
  @IsIn(['Confirmed', 'Dispatched', 'Delivered', 'Cancelled'])
  status: Exclude<OrderStatus, 'Placed'>;

  /** Required when cancelling. */
  @ValidateIf((o: UpdateOrderStatusRequestDto) => o.status === 'Cancelled')
  @Transform(trim) @IsString() @MinLength(5, { message: 'A reason of at least 5 characters is required to cancel.' }) @MaxLength(500)
  reason?: string;
}
