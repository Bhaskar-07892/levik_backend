import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { WalletQueryDto } from '../dto/points.request.dto.js';
import { PointsBalanceResponseDto, PointsTransactionPageResponseDto } from '../dto/points.response.dto.js';
import { PointsMapper } from '../mappers/points.mapper.js';
import { PointsService } from '../services/points.service.js';

@ApiTags('App · Wallet')
@ApiBearerAuth()
@Roles('plumber', 'retailer')
@Controller('app/wallet')
export class AppWalletController {
  constructor(private readonly points: PointsService) {}

  @Get()
  async balance(@CurrentUser() user: AuthenticatedUser): Promise<PointsBalanceResponseDto> {
    return PointsMapper.balanceToDto(await this.points.balance(user.sub));
  }

  @Get('transactions')
  async transactions(@CurrentUser() user: AuthenticatedUser, @Query() query: WalletQueryDto): Promise<PointsTransactionPageResponseDto> {
    return toPage(await this.points.ledger({ page: query.page, pageSize: query.pageSize, userId: user.sub }), PointsMapper.txnToDto);
  }
}
