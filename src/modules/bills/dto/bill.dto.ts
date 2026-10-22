import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { trim } from '../../../common/utils/transform.util.js';

export class BillLineRequestDto {
  @IsString() productId: string;
  @IsInt() @Min(1) @Max(10_000) quantity: number;
  /** Selling price per unit; defaults to the catalogue price (MRP). */
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) unitPrice?: number;
}

export class BillCustomerDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) customerName: string;
  @IsOptional() @Transform(trim) @Matches(/^(\+?91[\s-]?)?[6-9]\d{4}\s?\d{5}$/, { message: 'Enter a valid Indian mobile number.' }) customerMobile?: string;
}

/** Bill for a walk-in sale: takes the items out of the store's stock. */
export class CreateBillRequestDto extends BillCustomerDto {
  @ApiProperty({ type: [BillLineRequestDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => BillLineRequestDto)
  lines: BillLineRequestDto[];
}

export class BillQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() retailerId?: string;
}

export class BillLineResponseDto {
  productId: string;
  productName: string;
  modelCode: string;
  quantity: number;
  unitPrice: number;
  value: number;
}

export class BillResponseDto {
  id: string;
  retailerId: string;
  retailerName: string;
  /** Per-store number, e.g. B-0007. */
  billNumber: string;
  customerName: string;
  customerMobile?: string;
  /** The plumber sale this bill was raised for. */
  scanId?: string;
  totalValue: number;
  createdAt: string;
  createdBy: string;
  /** Signed link to the bill PDF, relative to the API origin. */
  pdfUrl: string;
  lines: BillLineResponseDto[];
}

export class BillPageResponseDto {
  items: BillResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
