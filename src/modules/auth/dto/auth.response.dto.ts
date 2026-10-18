import { ApiProperty } from '@nestjs/swagger';
import { ROLES, type Role } from '../../../common/interfaces/authenticated-user.interface.js';

export class SessionUserDto {
  id: string;
  @ApiProperty({ enum: ROLES })
  role: Role;
  name?: string;
  phone?: string;
}

export class AuthTokensResponseDto {
  accessToken: string;
  /** Seconds until the access token expires. */
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: SessionUserDto;
}

export class OtpRequestedResponseDto {
  /** Seconds until the OTP expires. */
  expiresIn: number;
}
