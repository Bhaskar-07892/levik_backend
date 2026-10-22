import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { SCAN_STATUSES, type ScanStatus } from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { trim } from '../../../common/utils/transform.util.js';
import { BillCustomerDto } from '../../bills/dto/bill.dto.js';


export class ScanQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SCAN_STATUSES })
  @IsOptional() @IsIn(SCAN_STATUSES)
  status?: ScanStatus;

  @IsOptional() @IsString()
  plumberId?: string;

  @IsOptional() @IsString()
  productId?: string;

  /** Retailer ID, or "none" for scans without proof of sale. */
  @IsOptional() @IsString()
  retailerId?: string;

  @IsOptional() @Type(() => Date) @IsDate()
  from?: Date;

  @IsOptional() @Type(() => Date) @IsDate()
  to?: Date;
}

export class MyScanQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SCAN_STATUSES })
  @IsOptional() @IsIn(SCAN_STATUSES)
  status?: ScanStatus;
}

export class ApproveScanRequestDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  note?: string;
}

export class SubmitScanRequestDto {
  /** Raw QR payload from the camera, or the serial typed from the label. */
  @Transform(trim) @IsString() @MinLength(4) @MaxLength(300)
  code: string;

  /** Shop the product was bought from (proof of sale). */
  @IsOptional() @IsString()
  retailerId?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(40)
  invoiceNumber?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(200)
  siteLocation?: string;

  /** Key from POST /uploads (purpose scan-photo). */
  @IsOptional() @IsString()
  photoKey?: string;
}

export class RetailerSaleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['Pending', 'Confirmed', 'Declined'] })
  @IsOptional() @IsIn(['Pending', 'Confirmed', 'Declined']) decision?: 'Pending' | 'Confirmed' | 'Declined';
}

export class SaleBillRequestDto extends BillCustomerDto {
  /** Selling price for this unit; defaults to the catalogue price. */
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) unitPrice?: number;
}

export class ConfirmSaleRequestDto {
  /** Also issue a bill to the buyer (e.g. the plumber or their customer). */
  @IsOptional() @ValidateNested() @Type(() => SaleBillRequestDto) bill?: SaleBillRequestDto;
}
