import { Body, Controller, Get, Param, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import type { AuthenticatedUser, ParticipantRole } from '../../../common/interfaces/authenticated-user.interface.js';
import { PointsService } from '../../points/services/points.service.js';
import {
  AdjustRewardStockRequestDto,
  AppRewardQueryDto,
  CreateRewardRequestDto,
  RewardQueryDto,
  UpdateRewardRequestDto,
} from '../dto/reward.request.dto.js';
import { AppRewardPageResponseDto, RewardPageResponseDto, RewardResponseDto } from '../dto/reward.response.dto.js';
import { RewardMapper } from '../mappers/reward.mapper.js';
import { RewardsService } from '../services/rewards.service.js';

@ApiTags('Admin · Rewards')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/rewards')
export class AdminRewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Get()
  async list(@Query() query: RewardQueryDto): Promise<RewardPageResponseDto> {
    return toPage(await this.rewards.list(query), RewardMapper.toDto);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<RewardResponseDto> {
    return RewardMapper.toDto(await this.rewards.get(id));
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateRewardRequestDto): Promise<RewardResponseDto> {
    return RewardMapper.toDto(await this.rewards.create(actorFrom(user), { ...body, isActive: body.isActive ?? true }));
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateRewardRequestDto): Promise<RewardResponseDto> {
    return RewardMapper.toDto(await this.rewards.update(actorFrom(user), id, body));
  }

  @Post(':id/stock-adjustments')
  @HttpCode(HttpStatus.OK)
  async adjustStock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AdjustRewardStockRequestDto): Promise<RewardResponseDto> {
    return RewardMapper.toDto(await this.rewards.adjustStock(actorFrom(user), id, body.delta, body.reason));
  }
}

@ApiTags('App · Rewards')
@ApiBearerAuth()
@Roles('plumber', 'retailer')
@Controller('app/rewards')
export class AppRewardsController {
  constructor(
    private readonly rewards: RewardsService,
    private readonly points: PointsService,
  ) {}

  /** Active rewards for the caller's role, with how many points they still need for each. */
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: AppRewardQueryDto): Promise<AppRewardPageResponseDto> {
    const [page, available] = await Promise.all([
      this.rewards.list({ ...query, isActive: true, eligibleRole: user.role as ParticipantRole }),
      this.points.available(user.sub),
    ]);
    return toPage(page, (r) => RewardMapper.toAppDto(r, available));
  }
}
