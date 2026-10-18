import { Body, Controller, Get, Param, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import type { AuthenticatedUser, ParticipantRole } from '../../../common/interfaces/authenticated-user.interface.js';
import {
  MyRedemptionQueryDto,
  RedemptionQueryDto,
  RequestRedemptionRequestDto,
  UpdateRedemptionStatusRequestDto,
} from '../dto/redemption.request.dto.js';
import {
  AppRedemptionPageResponseDto,
  AppRedemptionResponseDto,
  RedemptionPageResponseDto,
  RedemptionResponseDto,
  RedemptionReviewResponseDto,
} from '../dto/redemption.response.dto.js';
import { RedemptionMapper } from '../mappers/redemption.mapper.js';
import { RedemptionsService } from '../services/redemptions.service.js';

@ApiTags('Admin · Redemptions')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/redemptions')
export class AdminRedemptionsController {
  constructor(private readonly redemptions: RedemptionsService) {}

  @Get()
  async list(@Query() query: RedemptionQueryDto): Promise<RedemptionPageResponseDto> {
    return toPage(await this.redemptions.list(query), RedemptionMapper.toDto);
  }

  @Get('status-counts')
  statusCounts(): Promise<Record<string, number>> {
    return this.redemptions.statusCounts();
  }

  /** Redemption + balance + eligibility checks + allowed next statuses + ledger entries + history. */
  @Get(':id')
  async review(@Param('id') id: string): Promise<RedemptionReviewResponseDto> {
    return RedemptionMapper.reviewToDto(await this.redemptions.review(id));
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<RedemptionResponseDto> {
    return RedemptionMapper.toDto(await this.redemptions.approve(actorFrom(user), id));
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  async transition(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateRedemptionStatusRequestDto): Promise<RedemptionResponseDto> {
    const { status, ...details } = body;
    return RedemptionMapper.toDto(await this.redemptions.transition(actorFrom(user), id, status, details));
  }
}

@ApiTags('App · Redemptions')
@ApiBearerAuth()
@Roles('plumber', 'retailer')
@Controller('app/redemptions')
export class AppRedemptionsController {
  constructor(private readonly redemptions: RedemptionsService) {}

  @Post()
  async request(@CurrentUser() user: AuthenticatedUser, @Body() body: RequestRedemptionRequestDto): Promise<AppRedemptionResponseDto> {
    return RedemptionMapper.toAppDto(await this.redemptions.request(user.sub, user.role as ParticipantRole, body.rewardId, body.deliveryAddress));
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: MyRedemptionQueryDto): Promise<AppRedemptionPageResponseDto> {
    return toPage(await this.redemptions.list({ ...query, userId: user.sub }), RedemptionMapper.toAppDto);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<AppRedemptionResponseDto> {
    return RedemptionMapper.toAppDto(await this.redemptions.get(id, user.sub));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<AppRedemptionResponseDto> {
    return RedemptionMapper.toAppDto(await this.redemptions.cancelOwn(user.sub, id));
  }
}
