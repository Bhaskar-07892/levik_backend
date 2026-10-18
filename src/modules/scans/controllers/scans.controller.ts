import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { ApprovalResultResponseDto } from '../../../common/dto/check.response.dto.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import { ReasonRequestDto } from '../../../common/dto/reason.request.dto.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { ApproveScanRequestDto, MyScanQueryDto, ScanQueryDto, SubmitScanRequestDto } from '../dto/scan.request.dto.js';
import {
  AppScanPageResponseDto,
  AppScanResponseDto,
  ScanPageResponseDto,
  ScanResponseDto,
  ScanReviewResponseDto,
} from '../dto/scan.response.dto.js';
import { ScanMapper } from '../mappers/scan.mapper.js';
import { ScansService } from '../services/scans.service.js';

@ApiTags('Admin · Product scans')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/scans')
export class AdminScansController {
  constructor(private readonly scans: ScansService) {}

  @Get()
  async list(@Query() query: ScanQueryDto): Promise<ScanPageResponseDto> {
    return toPage(await this.scans.list(query), ScanMapper.toDto);
  }

  @Get('status-counts')
  statusCounts(): Promise<Record<string, number>> {
    return this.scans.statusCounts();
  }

  /** Scan + plumber balance + linked invoice + checks + points + scheme impact + history. */
  @Get(':id')
  async review(@Param('id') id: string): Promise<ScanReviewResponseDto> {
    return ScanMapper.reviewToDto(await this.scans.review(id));
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ApproveScanRequestDto): Promise<ApprovalResultResponseDto> {
    const result = await this.scans.approve(actorFrom(user), id, body.note);
    return { ...result, ledgerTxnId: result.ledgerTxnId ?? undefined };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReasonRequestDto): Promise<ScanResponseDto> {
    return ScanMapper.toDto(await this.scans.reject(actorFrom(user), id, body.reason));
  }

  @Post(':id/flag')
  @HttpCode(HttpStatus.OK)
  async flag(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReasonRequestDto): Promise<ScanResponseDto> {
    return ScanMapper.toDto(await this.scans.flag(actorFrom(user), id, body.reason));
  }
}

@ApiTags('App · Scans')
@ApiBearerAuth()
@Roles('plumber')
@Controller('app/scans')
export class AppScansController {
  constructor(private readonly scans: ScansService) {}

  @Post()
  async submit(@CurrentUser() user: AuthenticatedUser, @Body() body: SubmitScanRequestDto): Promise<AppScanResponseDto> {
    const scan = await this.scans.submit(user.sub, {
      code: body.code,
      retailerId: body.retailerId ?? null,
      invoiceNumber: body.invoiceNumber ?? null,
      siteLocation: body.siteLocation ?? '',
      photoKey: body.photoKey ?? null,
    });
    return ScanMapper.toAppDto(scan);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: MyScanQueryDto): Promise<AppScanPageResponseDto> {
    return toPage(await this.scans.list({ ...query, plumberId: user.sub }), ScanMapper.toAppDto);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<AppScanResponseDto> {
    return ScanMapper.toAppDto(await this.scans.get(id, user.sub));
  }
}
