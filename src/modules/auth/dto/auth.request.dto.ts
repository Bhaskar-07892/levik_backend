import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { USER_ROLES, type UserRole } from '../../../common/domain/enums.js';
import { trim } from '../../../common/utils/transform.util.js';


export class AdminLoginRequestDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;
}

export class OtpRequestDto {
  /** Indian mobile: "+91 98290 11234", "919829011234" or "9829011234". */
  @Transform(trim)
  @IsString()
  @Matches(/^[+\d\s-]{10,16}$/, { message: 'Enter a valid mobile number.' })
  phone: string;
}

export class OtpVerifyRequestDto extends OtpRequestDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits.' })
  code: string;

  /** Only needed if the number is registered as both a plumber and a retailer. */
  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;
}

export class RefreshTokenRequestDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  refreshToken: string;
}
