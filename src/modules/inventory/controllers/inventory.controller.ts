import { Body, Controller, Get, Param, Patch, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import {
  InventoryItemResponseDto,
  InventoryPageResponseDto,
  InventoryQueryDto,
  InventorySummaryResponseDto,
  MyInventoryQueryDto,
  ReportStockRequestDto,
  UpdateInventoryRequestDto,
} from '../dto/inventory.dto.js';
import { InventoryMapper } from '../mappers/inventory.mapper.js';
import { InventoryService } from '../services/inventory.service.js';

@ApiTags('Admin · Inventory')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  async list(@Query() query: InventoryQueryDto): Promise<InventoryPageResponseDto> {
    return toPage(await this.inventory.list(query), InventoryMapper.toDto);
  }

  @Get('summary')
  summary(): Promise<InventorySummaryResponseDto> {
    return this.inventory.summary();
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateInventoryRequestDto): Promise<InventoryItemResponseDto> {
    return InventoryMapper.toDto(await this.inventory.update(actorFrom(user), id, body.quantity, body.note));
  }
}

@ApiTags('App · Inventory')
@ApiBearerAuth()
@Roles('retailer')
@Controller('app/inventory')
export class AppInventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  async mine(@CurrentUser() user: AuthenticatedUser, @Query() query: MyInventoryQueryDto): Promise<InventoryPageResponseDto> {
    return toPage(await this.inventory.list({ ...query, retailerId: user.sub }), InventoryMapper.toDto);
  }

  /** Reports the current stock of one product at the retailer's shop (create or overwrite). */
  @Put(':productId')
  async report(@CurrentUser() user: AuthenticatedUser, @Param('productId') productId: string, @Body() body: ReportStockRequestDto): Promise<InventoryItemResponseDto> {
    return InventoryMapper.toDto(await this.inventory.report(user.sub, productId, body.quantity));
  }
}
