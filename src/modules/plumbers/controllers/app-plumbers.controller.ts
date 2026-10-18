import { Body, Controller, Get, Headers, Patch, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { AuthMapper } from '../../auth/auth.mapper.js';
import { AuthTokensResponseDto } from '../../auth/dto/auth.response.dto.js';
import { AuthService } from '../../auth/services/auth.service.js';
import { RegisterPlumberRequestDto, SubmitKycRequestDto, UpdateMyPlumberProfileRequestDto } from '../dto/plumber.request.dto.js';
import { PlumberDetailResponseDto, PlumberResponseDto } from '../dto/plumber.response.dto.js';
import { PlumberMapper } from '../mappers/plumber.mapper.js';
import { PlumbersService } from '../services/plumbers.service.js';

@ApiTags('App · Plumber profile')
@ApiBearerAuth()
@Controller('app/plumbers')
export class AppPlumbersController {
  constructor(
    private readonly plumbers: PlumbersService,
    private readonly auth: AuthService,
  ) {}

  /** Guest (OTP-verified phone) → plumber. Returns a new session for the plumber account. */
  @Roles('guest')
  @Post('register')
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RegisterPlumberRequestDto,
    @Headers('user-agent') ua?: string,
  ): Promise<AuthTokensResponseDto> {
    if (!user.phone) throw AppException.rule(ErrorCode.REGISTRATION_REQUIRED, 'Verify your phone number first.');
    const plumber = await this.plumbers.register(user.phone, {
      name: body.name,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      experienceYears: body.experienceYears ?? 0,
      specialization: body.specialization ?? '',
      preferredRetailerId: body.preferredRetailerId ?? null,
    });
    const tokens = await this.auth.issueForParticipant(
      { id: plumber.id, role: 'plumber', name: plumber.name, location: `${plumber.city}, ${plumber.state}`, accountStatus: plumber.accountStatus, verified: false },
      user.phone,
      ua,
    );
    return AuthMapper.tokensToDto(tokens);
  }

  @Roles('plumber')
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<PlumberDetailResponseDto> {
    return PlumberMapper.detailToDto(await this.plumbers.detail(user.sub));
  }

  @Roles('plumber')
  @Patch('me')
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateMyPlumberProfileRequestDto): Promise<PlumberResponseDto> {
    return PlumberMapper.toDto(await this.plumbers.updateProfile({ id: user.sub, name: user.name ?? user.sub }, user.sub, body));
  }

  /** Called by the KYC flow with the masked result; verification stays Pending until an admin approves. */
  @Roles('plumber')
  @Post('me/kyc')
  @HttpCode(HttpStatus.OK)
  async submitKyc(@CurrentUser() user: AuthenticatedUser, @Body() body: SubmitKycRequestDto): Promise<PlumberResponseDto> {
    return PlumberMapper.toDto(await this.plumbers.submitKyc(user.sub, body.aadhaarLast4));
  }
}
