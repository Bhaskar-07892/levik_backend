import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserAgent } from '../../../common/decorators/user-agent.decorator.js';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { AuthMapper } from '../auth.mapper.js';
import { AdminLoginRequestDto, OtpRequestDto, OtpVerifyRequestDto, RefreshTokenRequestDto } from '../dto/auth.request.dto.js';
import { AuthTokensResponseDto, OtpRequestedResponseDto, SessionUserDto } from '../dto/auth.response.dto.js';
import { AuthService } from '../services/auth.service.js';

const STRICT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(STRICT)
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() body: AdminLoginRequestDto, @UserAgent() ua?: string): Promise<AuthTokensResponseDto> {
    return AuthMapper.tokensToDto(await this.auth.adminLogin(body.email, body.password, ua));
  }

  @Public()
  @Throttle(STRICT)
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() body: OtpRequestDto): Promise<OtpRequestedResponseDto> {
    return this.auth.requestOtp(body.phone);
  }

  @Public()
  @Throttle(STRICT)
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: OtpVerifyRequestDto, @UserAgent() ua?: string): Promise<AuthTokensResponseDto> {
    return AuthMapper.tokensToDto(await this.auth.verifyOtp(body.phone, body.code, body.role, ua));
  }

  @Public()
  @Throttle(STRICT)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenRequestDto, @UserAgent() ua?: string): Promise<AuthTokensResponseDto> {
    return AuthMapper.tokensToDto(await this.auth.refresh(body.refreshToken, ua));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: RefreshTokenRequestDto): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }

  @ApiBearerAuth()
  @Roles('admin', 'plumber', 'retailer', 'guest')
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): SessionUserDto {
    return { id: user.sub, role: user.role, name: user.name, phone: user.phone };
  }
}
