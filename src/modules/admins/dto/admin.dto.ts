import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAdminProfileRequestDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name: string;
}

export class AdminProfileResponseDto {
  id: string;
  name: string;
  email: string;
  role: 'Programme Administrator';
  lastLoginAt?: string;
}
