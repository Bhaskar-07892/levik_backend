import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { AdjustPointsRequestDto, LedgerQueryDto } from '../dto/points.request.dto.js';
import {
  AdjustmentResponseDto,
  LedgerTotalsResponseDto,
  PointsBalanceResponseDto,
  PointsTransactionPageResponseDto,
  PointsTransactionResponseDto,
} from '../dto/points.response.dto.js';
import { PointsMapper } from '../mappers/points.mapper.js';
import { PointsService } from '../services/points.service.js';

@ApiTags('Admin · Points ledger')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/points')
export class AdminPointsController {
  constructor(private readonly points: PointsService) {}

  @Get('ledger')
  async ledger(@Query() query: LedgerQueryDto): Promise<PointsTransactionPageResponseDto> {
    return toPage(await this.points.ledger(query), PointsMapper.txnToDto);
  }

  @Get('ledger/totals')
  totals(@Query() query: LedgerQueryDto): Promise<LedgerTotalsResponseDto> {
    return this.points.totals(query);
  }

  @Get('ledger/:id')
  async transaction(@Param('id') id: string): Promise<PointsTransactionResponseDto> {
    return PointsMapper.txnToDto(await this.points.transaction(id));
  }

  @Get('balances/:userId')
  async balance(@Param('userId') userId: string): Promise<PointsBalanceResponseDto> {
    return PointsMapper.balanceToDto(await this.points.balance(userId));
  }

  @Post('adjustments')
  async adjust(@CurrentUser() user: AuthenticatedUser, @Body() body: AdjustPointsRequestDto): Promise<AdjustmentResponseDto> {
    return { transactionId: await this.points.adjust(actorFrom(user), body.userId, body.amount, body.reason) };
  }
}
