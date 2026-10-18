import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { ApprovalResultResponseDto } from '../../../common/dto/check.response.dto.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import { ReasonRequestDto } from '../../../common/dto/reason.request.dto.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import {
  InvoiceQueryDto,
  MyInvoiceQueryDto,
  RequestInvoiceInfoRequestDto,
  ResubmitInvoiceRequestDto,
  SubmitInvoiceRequestDto,
} from '../dto/invoice.request.dto.js';
import {
  InvoiceDetailResponseDto,
  InvoiceIncentiveResponseDto,
  InvoicePageResponseDto,
  InvoiceReviewResponseDto,
} from '../dto/invoice.response.dto.js';
import { InvoiceMapper } from '../mappers/invoice.mapper.js';
import { InvoicesService } from '../services/invoices.service.js';

@ApiTags('Admin · Invoices')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/invoices')
export class AdminInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  async list(@Query() query: InvoiceQueryDto): Promise<InvoicePageResponseDto> {
    return toPage(await this.invoices.list(query), InvoiceMapper.toListDto);
  }

  @Get('status-counts')
  statusCounts(): Promise<Record<string, number>> {
    return this.invoices.statusCounts();
  }

  /** Invoice + lines + totals + incentive preview + checks + scheme impact + history. */
  @Get(':id')
  async review(@Param('id') id: string): Promise<InvoiceReviewResponseDto> {
    return InvoiceMapper.reviewToDto(await this.invoices.review(id));
  }

  @Post(':id/start-review')
  @HttpCode(HttpStatus.OK)
  async startReview(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return InvoiceMapper.toListDto(await this.invoices.startReview(actorFrom(user), id));
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<ApprovalResultResponseDto> {
    const result = await this.invoices.approve(actorFrom(user), id);
    return { ...result, ledgerTxnId: result.ledgerTxnId ?? undefined };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReasonRequestDto) {
    return InvoiceMapper.toListDto(await this.invoices.reject(actorFrom(user), id, body.reason));
  }

  @Post(':id/request-info')
  @HttpCode(HttpStatus.OK)
  async requestInfo(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RequestInvoiceInfoRequestDto) {
    return InvoiceMapper.toListDto(await this.invoices.requestInfo(actorFrom(user), id, body.message));
  }
}

@ApiTags('App · Invoices')
@ApiBearerAuth()
@Roles('retailer')
@Controller('app/invoices')
export class AppInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  async submit(@CurrentUser() user: AuthenticatedUser, @Body() body: SubmitInvoiceRequestDto): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.invoices.submit(user.sub, {
      invoiceNumber: body.invoiceNumber,
      invoiceDate: body.invoiceDate,
      buyerName: body.buyerName,
      documentKey: body.documentKey ?? null,
      lines: body.lines,
    });
    return InvoiceMapper.toDetailDto(invoice);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: MyInvoiceQueryDto): Promise<InvoicePageResponseDto> {
    return toPage(await this.invoices.list({ ...query, retailerId: user.sub }), InvoiceMapper.toListDto);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<InvoiceDetailResponseDto> {
    return InvoiceMapper.toDetailDto(await this.invoices.get(id, user.sub));
  }

  @Get(':id/incentive')
  async incentive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<InvoiceIncentiveResponseDto> {
    const incentive = await this.invoices.incentiveFor(id, user.sub);
    return { ...incentive, lines: incentive.lines.map((l) => ({ ...l, reason: l.reason ?? undefined })) };
  }

  @Post(':id/resubmit')
  @HttpCode(HttpStatus.OK)
  async resubmit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ResubmitInvoiceRequestDto): Promise<InvoiceDetailResponseDto> {
    return InvoiceMapper.toDetailDto(await this.invoices.resubmit(user.sub, id, body.documentKey));
  }
}
