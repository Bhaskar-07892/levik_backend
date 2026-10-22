import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { PaginationQueryDto, toPage } from '../../../common/dto/pagination.dto.js';
import { AppException } from '../../../common/errors/app.exception.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { FileLinkQueryDto } from '../../uploads/dto/upload.dto.js';
import { verifyDocumentLink } from '../../uploads/file-url.js';
import { BillPageResponseDto, BillQueryDto, BillResponseDto, CreateBillRequestDto } from '../dto/bill.dto.js';
import { BillMapper } from '../mappers/bill.mapper.js';
import { BillsService } from '../services/bills.service.js';

@ApiTags('Admin · Bills')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/bills')
export class AdminBillsController {
  constructor(private readonly bills: BillsService) {}

  /** Bills retailers issued to their buyers. */
  @Get()
  async list(@Query() query: BillQueryDto): Promise<BillPageResponseDto> {
    return toPage(await this.bills.list(query), BillMapper.toDto);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<BillResponseDto> {
    return BillMapper.toDto(await this.bills.get(id));
  }
}

@ApiTags('App · Bills')
@ApiBearerAuth()
@Roles('retailer')
@Controller('app/bills')
export class AppBillsController {
  constructor(private readonly bills: BillsService) {}

  /** Bill for a walk-in sale; takes the items out of stock. */
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateBillRequestDto): Promise<BillResponseDto> {
    return BillMapper.toDto(await this.bills.createWalkIn(user.sub, body));
  }

  @Get()
  async mine(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto): Promise<BillPageResponseDto> {
    return toPage(await this.bills.list({ ...query, retailerId: user.sub }), BillMapper.toDto);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<BillResponseDto> {
    return BillMapper.toDto(await this.bills.get(id, user.sub));
  }
}

/** Opens a bill PDF from its signed link (no auth header). */
@ApiTags('Documents')
@Public()
@Controller('documents/bills')
export class BillDocumentController {
  constructor(private readonly bills: BillsService) {}

  @Get(':id')
  @ApiProduces('application/pdf')
  async open(@Param('id') id: string, @Query() query: FileLinkQueryDto, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    if (!verifyDocumentLink('bills', id, query.exp, query.sig)) throw AppException.notFound('Bill');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const { filename, stream } = await this.bills.pdf(id);
    return new StreamableFile(stream, { type: 'application/pdf', disposition: `inline; filename="${filename}"` });
  }
}
