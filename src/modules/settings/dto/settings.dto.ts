import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class NotificationPreferencesDto {
  @IsOptional() @IsBoolean() pendingScans?: boolean;
  @IsOptional() @IsBoolean() pendingInvoices?: boolean;
  @IsOptional() @IsBoolean() redemptions?: boolean;
  @IsOptional() @IsBoolean() lowStock?: boolean;
}

export class UpdateSettingsRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  programmeName?: string;

  /** Retailer incentive points per ₹100 of eligible pre-GST invoice value. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(20)
  retailerPointsPer100?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  lowStockThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxDailyScansPerPlumber?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: NotificationPreferencesDto;
}

export class NotificationPreferencesResponseDto {
  pendingScans: boolean;
  pendingInvoices: boolean;
  redemptions: boolean;
  lowStock: boolean;
}

export class SettingsResponseDto {
  programmeName: string;
  retailerPointsPer100: number;
  lowStockThreshold: number;
  notifications: NotificationPreferencesResponseDto;
  maxDailyScansPerPlumber: number;
  updatedAt: string;
}

export class PublicSettingsResponseDto {
  programmeName: string;
  maxDailyScansPerPlumber: number;
}
