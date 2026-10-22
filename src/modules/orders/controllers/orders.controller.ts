import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { ReasonRequestDto } from '../../../common/dto/reason.request.dto.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import { AppException } from '../../../common/errors/app.exception.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { StatusEventResponseDto } from '../../audit/dto/audit.response.dto.js';
import { AuditMapper } from '../../audit/mappers/audit.mapper.js';
import { FileLinkQueryDto } from '../../uploads/dto/upload.dto.js';
import { verifyDocumentLink } from '../../uploads/file-url.js';
import { MyOrderQueryDto, OrderQueryDto, PlaceOrderRequestDto, UpdateOrderStatusRequestDto } from '../dto/order.request.dto.js';
import { OrderPageResponseDto, OrderResponseDto } from '../dto/order.response.dto.js';
import { OrderMapper } from '../mappers/order.mapper.js';
import { OrdersService } from '../services/orders.service.js';

@ApiTags('Admin · Orders')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Orders from every retailer, newest first. */
  @Get()
  async list(@Query() query: OrderQueryDto): Promise<OrderPageResponseDto> {
    return toPage(await this.orders.list(query), OrderMapper.toDto);
  }

  @Get('status-counts')
  statusCounts(): Promise<Record<string, number>> {
    return this.orders.statusCounts();
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<OrderResponseDto> {
    return OrderMapper.toDto(await this.orders.get(id));
  }

  @Get(':id/timeline')
  async timeline(@Param('id') id: string): Promise<StatusEventResponseDto[]> {
    return (await this.orders.timeline(id)).map(AuditMapper.eventToDto);
  }

  /** Confirm, dispatch, deliver (adds stock and issues the purchase invoice) or cancel (reason required). */
  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  async transition(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateOrderStatusRequestDto): Promise<OrderResponseDto> {
    return OrderMapper.toDto(await this.orders.transition(actorFrom(user), id, body.status, body.reason));
  }
}

@ApiTags('App · Orders')
@ApiBearerAuth()
@Roles('retailer')
@Controller('app/orders')
export class AppOrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Places a stock order with Levik at catalogue prices. */
  @Post()
  async place(@CurrentUser() user: AuthenticatedUser, @Body() body: PlaceOrderRequestDto): Promise<OrderResponseDto> {
    return OrderMapper.toDto(await this.orders.place(user.sub, body));
  }

  @Get()
  async mine(@CurrentUser() user: AuthenticatedUser, @Query() query: MyOrderQueryDto): Promise<OrderPageResponseDto> {
    return toPage(await this.orders.list({ ...query, retailerId: user.sub }), OrderMapper.toDto);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<OrderResponseDto> {
    return OrderMapper.toDto(await this.orders.get(id, user.sub));
  }

  @Get(':id/timeline')
  async timeline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<StatusEventResponseDto[]> {
    await this.orders.get(id, user.sub);
    return (await this.orders.timeline(id)).map(AuditMapper.eventToDto);
  }

  /** Withdraws an order Levik has not confirmed yet. */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReasonRequestDto): Promise<OrderResponseDto> {
    return OrderMapper.toDto(await this.orders.cancelByRetailer(user.sub, id, body.reason));
  }
}

/** Opens a purchase invoice PDF from its signed link (no auth header), for both apps. */
@ApiTags('Documents')
@Public()
@Controller('documents/purchase-invoices')
export class PurchaseInvoiceDocumentController {
  constructor(private readonly orders: OrdersService) {}

  @Get(':id')
  @ApiProduces('application/pdf')
  async open(@Param('id') id: string, @Query() query: FileLinkQueryDto, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    if (!verifyDocumentLink('purchase-invoices', id, query.exp, query.sig)) throw AppException.notFound('Purchase invoice');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const { filename, stream } = await this.orders.purchaseInvoicePdf(id);
    return new StreamableFile(stream, { type: 'application/pdf', disposition: `inline; filename="${filename}"` });
  }
}
