import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserAgent } from '../../../common/decorators/user-agent.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { AuthMapper } from '../../auth/auth.mapper.js';
import { AuthTokensResponseDto } from '../../auth/dto/auth.response.dto.js';
import { AuthService } from '../../auth/services/auth.service.js';
import { RegisterRetailerRequestDto, StoreQueryDto, UpdateMyRetailerProfileRequestDto } from '../dto/retailer.request.dto.js';
import { RetailerDetailResponseDto, RetailerResponseDto, StorePageResponseDto } from '../dto/retailer.response.dto.js';
import { RetailerMapper } from '../mappers/retailer.mapper.js';
import { RetailersService } from '../services/retailers.service.js';

@ApiTags('App · Retailer profile')
@ApiBearerAuth()
@Controller('app/retailers')
export class AppRetailersController {
  constructor(
    private readonly retailers: RetailersService,
    private readonly auth: AuthService,
  ) {}

  /** Guest (OTP-verified phone) → retailer application (Pending until an admin approves). */
  @Roles('guest')
  @Post('register')
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RegisterRetailerRequestDto,
    @UserAgent() ua?: string,
  ): Promise<AuthTokensResponseDto> {
    if (!user.phone) throw AppException.rule(ErrorCode.REGISTRATION_REQUIRED, 'Verify your phone number first.');
    const retailer = await this.retailers.register(user.phone, user.sub, {
      shopName: body.shopName,
      ownerName: body.ownerName,
      address: body.address,
      city: body.city,
      state: body.state,
      gstin: body.gstin || null,
      distributor: body.distributor ?? '',
      pincode: body.pincode,
      email: body.email || null,
      pan: body.pan || null,
      shopPhotoKey: body.shopPhotoKey ?? null,
      gstCertificateKey: body.gstCertificateKey ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
    });
    const tokens = await this.auth.issueForParticipant(
      { id: retailer.id, role: 'retailer', name: retailer.shopName, location: `${retailer.city}, ${retailer.state}`, accountStatus: retailer.accountStatus, verified: false },
      user.phone,
      ua,
    );
    return AuthMapper.tokensToDto(tokens);
  }

  @Roles('retailer')
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<RetailerDetailResponseDto> {
    return RetailerMapper.detailToDto(await this.retailers.detail(user.sub));
  }

  @Roles('retailer')
  @Patch('me')
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateMyRetailerProfileRequestDto): Promise<RetailerResponseDto> {
    return RetailerMapper.toDto(await this.retailers.updateProfile({ id: user.sub, name: user.name ?? user.sub }, user.sub, body));
  }
}

@ApiTags('App · Stores')
@ApiBearerAuth()
// Guests may list stores too: a plumber picks a preferred dealer while registering.
@Roles('plumber', 'retailer', 'guest')
@Controller('app/stores')
export class AppStoresController {
  constructor(private readonly retailers: RetailersService) {}

  /** Approved, active Levik stores ("nearby stores" and proof-of-sale picker). */
  @Get()
  async list(@Query() query: StoreQueryDto): Promise<StorePageResponseDto> {
    return toPage(await this.retailers.stores(query), RetailerMapper.storeToDto);
  }
}
