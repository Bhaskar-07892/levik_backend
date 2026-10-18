import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { INVOICE_STATUSES, type InvoiceStatus } from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { trim } from '../../../common/utils/transform.util.js';


export class InvoiceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: INVOICE_STATUSES })
  @IsOptional() @IsIn(INVOICE_STATUSES)
  status?: InvoiceStatus;

  @IsOptional() @IsString()
  retailerId?: string;

  @IsOptional() @Type(() => Date) @IsDate()
  from?: Date;

  @IsOptional() @Type(() => Date) @IsDate()
  to?: Date;
}

export class MyInvoiceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: INVOICE_STATUSES })
  @IsOptional() @IsIn(INVOICE_STATUSES)
  status?: InvoiceStatus;
}

export class InvoiceLineRequestDto {
  @IsString() @MinLength(3)
  productId: string;

  @IsInt() @Min(1) @Max(10_000)
  quantity: number;

  /** ₹ per unit, pre-GST. Defaults to the product MRP. */
  @IsOptional() @IsInt() @Min(0) @Max(10_000_000)
  unitPrice?: number;
}

export class SubmitInvoiceRequestDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(40)
  invoiceNumber: string;

  @Type(() => Date) @IsDate()
  invoiceDate: Date;

  @Transform(trim) @IsString() @MaxLength(120)
  buyerName: string;

  /** Key from POST /uploads (purpose invoice-document). */
  @IsOptional() @IsString()
  documentKey?: string;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => InvoiceLineRequestDto)
  lines: InvoiceLineRequestDto[];
}

export class ResubmitInvoiceRequestDto {
  /** Updated document after "More Information Required". */
  @IsOptional() @IsString()
  documentKey?: string;
}

export class RequestInvoiceInfoRequestDto {
  @Transform(trim) @IsString() @MinLength(5, { message: 'A message of at least 5 characters is required.' }) @MaxLength(500)
  message: string;
}
